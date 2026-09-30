# Zeno

*Math from zero to advanced — every small step counts.*

Zeno's paradox says you need infinitely many small steps to cross a room — and yet you get there.
Zeno is a free, open-source, self-hostable **math whiteboard for learning on your own**, from
counting with bar models and fractions all the way to graph theory, combinatorics, number theory, trigonometry, real analysis, integration techniques, differential equations, statistics, linear algebra, algorithms & data structures and 3D geometry.
UI in English, Russian and Georgian.

![A Zeno board: lattice multiplication, the unit circle, a Hamiltonian path in the Petersen graph, fraction division, ε–δ and Pascal's hockey stick](docs/screenshots/board.png)

*Every picture on the board is a live, editable object — double-click it to change the numbers. See [more screenshots](#screenshots).*

- Infinite whiteboard (Excalidraw): freehand, shapes, text, arrows, images, export to PNG/SVG
- **🧮 Counting — place-value mat (Singapore method, concrete stage)**: drag base-ten blocks
  (hundreds, tens, ones) onto a Hundreds | Tens | Ones mat — mouse or touch
  - Trade by dragging: a ten onto Ones breaks into 10 ones; a one onto Tens groups 10 ones into a ten
    (same for hundreds); drag off the mat to remove. Ones sit in ten-frames so tens are easy to see
  - Shows the number in expanded form (`125 = 100 + 10 + 15` flags that regrouping is needed)
  - 🎲 Challenge: "Make 347" with the total hidden, and a Check button (correct / too many / not enough)
- **▦ Models (Singapore method, pictorial stage)**
  - *Bar models*: part–whole, comparison, units; braces for totals, `?` for the unknown,
    `[1, 1]=?` to put a brace under some parts (e.g. "2/5 of 60")
  - *Fractions*: bars or circles, stacked fraction walls (equivalence, comparison), improper fractions
  - *Percent*: hundred grid, or percent bar in tenths with a double number line ("25% of 80")
  - *Number bonds*: a whole and 2–4 parts
  - *Multiplication*, from counting to algebra, each with a step-by-step slider:
    equal groups (3 × 4 = 4 + 4 + 4, with skip counts), arrays (rows with running totals; b × a = a × b),
    number-line jumps, the place-value area model (23 × 14 = 200 + 80 + 30 + 12 = 322), and the
    lattice (gelosia) method — digit products split by diagonals, bands added with carries, read down and along
  - *Fraction operations*: + − × ÷ with whole numbers, fractions, mixed numbers and decimals, step by step —
    lowest common denominator (lcm), cross-cancelling (with struck-out factors), keep–change–flip, simplifying by
    the gcd and back to a mixed number; bars on the common denominator, the area model for ×, and
    "how many times does it fit" for ÷
  - *Percentages & ratios*: step-by-step solvers with Singapore bar models — p% of a number (the 1% method),
    what percent, the whole from a part, increase/decrease with a multiplier, percentage change, reverse
    percentages (with the classic mistake shown in red), simple vs compound interest; simplifying ratios (also
    decimals and fractions), sharing a total in a ratio, one part known, and proportions with a ratio table
  - *Division*: long division step by step (divide, multiply, subtract, bring down) in three school layouts —
    the English bracket, the European corner layout (уголком / კუთხით) and short division with carried
    remainders; remainders as mixed numbers, decimal places, and repeating decimals (1 ÷ 7 = 0.(142857))
- **🧊 3D (three.js)** — rotate with the mouse, then insert a snapshot (stays editable, camera angle is saved)
  - *Solids*: cuboid, prism (regular 3–8-gon base), square pyramid, cylinder, cone, sphere —
    dimension labels, see-through mode, volume & surface-area formulas
  - *Nets*: a slider unfolds the cuboid, prism, pyramid, cylinder or cone into its net ("Top view" shows
    it flat); the cylinder's curved side unrolls into a 2πr × h rectangle between its circles, and the
    cone's into a sector of radius l and angle θ = 360°·r/l touching the base circle
  - *Matrix 3×3*: a 3×3 matrix acting on space — the unit cube becomes a parallelepiped with
    volume |det M|, î ĵ k̂ land on the (green / red / blue) columns, the z = 0 grid is transformed,
    and a slider animates from I to M; the snapshot includes the matrix and det
  - *Unit cubes*: volume as counting — an a × b × c cuboid, or build your own stacks on a plan grid
- **📐 Geometry** — drag points on a grid and everything is measured live
  - *Triangle*: side lengths (exact, e.g. √13), angles that always sum to 180°, the height from C
    with ½ · c · h, and its type (right / acute / obtuse · equilateral / isosceles / scalene)
  - *Quadrilateral*: angles sum to 360° (reflex corners too), perimeter, area, and a live name —
    square, rectangle, rhombus, parallelogram, trapezium, kite
  - *Circle*: r, d, C = 2πr, S = πr², C : d = π
  - *Pythagoras*: squares on all three sides of a right triangle — a² + b² = c² you can count on the grid
  - *Angle facts*: angles on a straight line (180°), around a point (360°), vertically opposite
    (equal, same colour), and parallel lines cut by a transversal — corresponding, alternate and
    co-interior angles, numbered 1–8
  - *Symmetry*: reflect a shape in any mirror line (vertical, horizontal, diagonal or tilted) with
    right-angle connectors and equal-distance ticks and A(4, 2) → A′(12, 2); find all lines of symmetry
    and the order of rotational symmetry automatically (square 4/4, parallelogram 0/2); and a practice
    mode where students drag the image points and press Check (correct points turn green)
  - *Protractor*: a real-looking protractor laid along arm OA (1° ticks, inner and outer scales);
    drag the arms, snap to 1° or 5°, and "hide the answer" so students read it themselves
- **[ ] Matrices** — exact fractions throughout
  - *Calculate with steps*: A ± B, A·B (each entry expanded), k·A, Aᵀ, det A (cofactor expansion),
    A⁻¹ (formula for 2×2, Gauss–Jordan on [A | I] for larger), and solving Ax = b by row reduction
    with every row operation shown — unique, parametric (x = 3 − 2t) or no solution (∅)
  - *Transformation*: a 2×2 matrix acting on the plane — bent grid, unit square → parallelogram
    with area |det|, basis vectors on the columns, an "F" that flips when det < 0, and a slider from I to M
- **⬡ Graph theory** — type any (multi)graph as an edge list, or start from K₅, K₃,₃, Petersen, the cube, …;
  force-directed, circular or two-ring layouts, and the same graph carries over between topics
  - *Properties*: degrees and the handshake lemma, components, bipartite (2-colouring, or an odd cycle as proof),
    trees, regular, simple and complete graphs
  - *Euler trails*: the parity test, Königsberg's bridges, and the trail found by Hierholzer's algorithm, numbered
  - *Hamiltonian cycles*: backtracking search for a cycle or path (dodecahedron, Petersen has none), Dirac's theorem
  - *Colouring*: the exact chromatic number vs Welsh–Powell greedy (with a crown graph where greedy fails), and the
    largest clique as a lower bound
  - *Walks*: the adjacency matrix and Aᵏ, the walks listed, and triangles from trace(A³) / 6
  - *Spanning trees*: Kirchhoff's matrix-tree theorem on the Laplacian, Cayley's nⁿ⁻², and every tree drawn when few
- **∧ Logic** — propositional logic and the reasoning puzzles of aptitude tests; type formulas with ¬ ∧ ∨ → ↔ ⊕
  (or ~ & | -> <-> ^, or words), with a symbol palette
  - *Truth tables*: built column by column from the subformulas; tautology, contradiction or satisfiable
  - *Equivalence*: two formulas side by side (De Morgan, contrapositive vs converse, distributivity), the rows
    where they differ, and one-way implication
  - *Normal forms*: a Karnaugh map (1–4 variables) with the loops of a minimal sum of products, wrap-around groups
    and don't-cares (`m(1,3,7) + d(0,2)`), the canonical Σm / ΠM forms and the minimal product of sums
  - *Circuits*: the formula as AND / OR / NOT / XOR / NAND / NOR gates, with the wires coloured by the input values
  - *Arguments*: validity by truth table with the counterexample row, and the rule named — modus ponens / tollens,
    hypothetical and disjunctive syllogism, transposition, dilemma — or the fallacy (affirming the consequent,
    denying the antecedent)
  - *Constraint boards*: grouping (bins with capacities) and ordering (slots) puzzles in a compact notation —
    `A@Chveli`, `C=G`, `A≠B`, `X<Y`, `[X·Y]`, `X∉m`, `F@Kala → E@Chveli` — with every conditional written
    together with its contrapositive, what is forced and ruled out before any question, an "if …" assumption worked
    on a copy of the board, and a sweep of the answer options showing which constraint kills each one; options
    that are statements (`C@Kala`) are marked must be true / must be false / could be / fixes the whole board
  - *Truth-tellers & liars*: Smullyan's islands solved by checking X ↔ (what X says) in every row
  - *Sets*: Venn diagrams (1–3 sets) of ∪ ∩ ∖ Δ ′ expressions, two expressions compared, and x ∈ … as logic
  - The examples include the 2025 NAEC master's exam in logical reasoning (variant I): the grouping and
    scheduling scenarios (items 12–17), the statues (8), the truth-teller (11) and the deduction items
- **ⁿCₖ Combinatorics** — exact counts (BigInt), with every case listed when small
  - *Counting*: permutations, combinations, sequences and multisets on an "order matters? / repetition?" grid,
    all outcomes listed (permutations grouped by combination, so P = C · r!), and anagrams of words (MISSISSIPPI)
  - *Pascal's triangle*: a row and the binomial expansion of (a + b)ⁿ, the addition rule, the hockey stick,
    odd entries forming Sierpiński's triangle, and the shallow diagonals giving Fibonacci numbers
  - *Stars and bars*: k identical balls in n boxes (empty allowed or not) with the diagrams and tuples
  - *Inclusion–exclusion*: two- or three-set Venn diagrams from set sizes, or "divisible by 2, 3 or 5 up to N"
  - *Special numbers*: Catalan numbers with all Dyck paths and bracket strings, derangements (→ 1/e), Stirling
    numbers of the second kind with Bell numbers and set partitions, and integer partitions as Ferrers diagrams
- **ℤ Number theory** — exact, with every step shown
  - *Primes*: the sieve of Eratosthenes up to 400, prime by prime with a slider; crossed-out numbers coloured by
    their smallest prime factor, and why primes up to √n suffice
  - *Factorization*: a factor tree (or a division ladder for many factors) up to 10¹², the canonical form,
    d(n), σ(n) and φ(n) worked out, divisors in pairs, and perfect / abundant / deficient
  - *GCD & LCM*: Euclid's algorithm beside squares cut from an a × b rectangle; the extended Euclid table with
    Bézout's identity; a·x + b·y = c with the general solution, lattice points on the line and non-negative solutions
  - *Modular arithmetic*: a mod m on a clock, + and × tables of ℤ_m (units, zero divisors, fields), fast powers
    by repeated squaring with Fermat / Euler, and modular inverses
  - *Congruences*: a·x ≡ b (mod m) with all solutions, and systems solved step by step with the Chinese remainder
    theorem (also for non-coprime moduli), drawn as rows of matching numbers
  - *Number bases*: any base 2–36, place-value expansion, repeated division read from bottom to top, and the
    grouping shortcut between bases 2, 4, 8, 16, 32
- **θ Trigonometry**
  - *Unit circle*: P = (cos θ, sin θ) with the cos (green), sin (red) and tan (orange) segments, the sine wave traced
    alongside, exact values for every multiple of 15° (sin 75° = (√6 + √2)/4), degrees or radians, quadrant
    signs (All Students Take Calculus) and the reference angle
  - *Right triangle*: SOH CAH TOA from any two of a, b, c, θ — every step, given parts in blue
  - *Solve a triangle*: SSS and SAS with the law of cosines, ASA/AAS with the law of sines, and the ambiguous
    SSA case — two triangles, one, or none — with areas ½·ab·sin C
  - *Graphs*: y = A·sin/cos/tan(B(x − C)) + D against the base graph, with amplitude, period, phase shift and
    midline marked, tan asymptotes, degrees or radians
  - *Equations*: sin/cos/tan x = k — the principal angle, all solutions in one turn on the unit circle and the graph,
    and the general solution (x = ±150° + 360°n)
- **ε Analysis** — the definitions of real analysis, drawn and checked numerically
  - *Sequences ε–N*: aₙ against the band L ± ε; N is found automatically (checked up to n = 5000),
    terms turn green from N on — and (−1)ⁿ shows what "no N works" looks like
  - *Limits ε–δ*: the ε-band, the largest δ that works (x² → 4, sin x / x → 1, (x² − 1)/(x − 1) → 2,
    one-sided √x), the ε × δ box the curve must stay in, and sign(x) at 0 where no δ exists
  - *Derivative*: secant through (a, f(a)) and (a + h, f(a + h)) with Δy / h, the tangent f′(a),
    an optional f′(x) curve, and |x| at 0 flagged as not differentiable (left slope −1, right 1)
  - *Riemann sums*: left, right, midpoint, trapezoid, lower and upper sums with n up to 100,
    negative area in red, and the error against the integral
  - *Series*: terms aₙ and partial sums Sₙ side by side — geometric, harmonic (diverges),
    1/n² → π²/6, alternating → ln 2, 1/n! → e, Leibniz → π
  - *Taylor*: Tₙ from symbolic derivatives with exact coefficients (x − x³/6), and a green strip
    where |f − Tₙ| < 0.01 that widens with the order up to the radius of convergence (1/(1 − x))
- **∫ Integrals** — integration techniques, every step shown and every answer checked
  (differentiating F must give back f; definite values are compared with Simpson's rule)
  - *Substitution*: ∫ c·x^(m−1)·g(a·xᵐ + b) dx with g = uⁿ, eᵘ, sin, cos or 1/u — du, the integral in u,
    back to x, new limits, and side-by-side pictures showing the x-area equals the u-area
  - *By parts*: the DI table for xⁿ·eᵃˣ, xⁿ·sin ax, xⁿ·cos ax (arrows with + − + signs), LIATE for xⁿ ln x,
    and the cyclic case eᵃˣ sin bx where I comes back and is solved for
  - *Partial fractions*: any numerator over a denominator that factors over ℚ (found by the rational root
    theorem): long division when improper, repeated factors, one irreducible quadratic (ln + arctan), exact fractions
  - *Trig substitution*: x = a sin θ, a tan θ, a sec θ for six standard forms, with the reference triangle
    that brings the answer back to x
- **y′ Differential equations** — solved step by step and checked against the equation
  - *Slope field*: dy/dx = f(x, y) as a field of dashes, with RK4 solution curves through your starting points
  - *Euler's method*: the step table yₙ₊₁ = yₙ + h·f(xₙ, yₙ), the Euler polygon against an accurate solution,
    and the error (halve h, halve the error)
  - *First order*: growth/decay (doubling time, half-life), Newton's cooling (equilibrium), logistic growth
    (partial fractions, fastest growth at K/2) and y′ + py = b·eᶜᵗ with an integrating factor — resonant case included
  - *Second order*: a·y″ + b·y′ + c·y = F·cos(ωt) — characteristic equation, the three root cases, C₁ and C₂
    from the initial values, over/critical/under-damped with the decay envelope, forcing and resonance (amplitude ∝ t)
  - *Phase plane*: x′ = f(x, y), y′ = g(x, y) with direction arrows and trajectories; for linear systems the matrix,
    trace, determinant, eigenvalues, eigenvector lines and the type (saddle, node, spiral, centre); predator–prey
    and the damped pendulum as nonlinear examples
- **📊 Statistics** — probability and statistics, with every number worked out
  - *Data*: dot plot or histogram plus a box plot on the same scale; mean (x̄ = Σx / n), median, mode,
    range, quartiles, IQR, σ and s, and outliers by the 1.5 · IQR rule
  - *Scatter*: least-squares line ŷ = a + bx through (x̄, ȳ), residuals, r and r², and the correlation in words
  - *Chance*: simulate a coin, a die or two dice up to 10 000 times — observed vs theoretical frequencies,
    and the relative frequency settling at p on a log scale (law of large numbers); seeded, so it re-renders the same
  - *Tree diagram*: two-stage trees with exact fractions (or decimals), products at the ends, total
    probability P(B) and Bayes P(A | B) — e.g. the medical test where a positive result means only 16 %
  - *Distributions*: binomial B(n, p), Poisson Po(λ) and normal N(μ, σ²) with a shaded P(a ≤ X ≤ b),
    E(X), σ and z-scores
  - *Sample means*: the central limit theorem — means of n dice, coins or a skewed population pile up
    into N(μ, σ²/n) as n grows
- **Vector spaces** (in *[ ] Matrices*) — exact fractions, pictures for ℝ² and ℝ³
  - *Span & independence*: row reduction to the pivots, rank = dim span, a basis from the pivot columns,
    the dependency relation (2v₁ + 3v₂ − v₃ = 0), and the span drawn as a line or plane
  - *Four fundamental subspaces*: C(A), R(A), N(A), N(Aᵀ) with bases and dimensions, and rank–nullity
  - *Coordinates*: [w]_B by solving B·c = w, drawn on the skewed grid of the basis
  - *Gram–Schmidt*: projections subtracted step by step, orthonormal vectors with simplified radicals (√10/4)
  - *Eigenvalues*: det(λI − A) exactly (Faddeev–LeVerrier), rational roots with multiplicity, eigenspaces as
    null spaces of A − λI, A = PDP⁻¹ when diagonalisable, non-diagonalisable and complex cases, and a
    picture of v and A·v on the eigenvector lines
- **⇅ Algorithms** — algorithms and data structures, traced step by step with every count shown
  - *Sorting*: bubble, insertion, selection, merge and quicksort (Lomuto) — one row per pass, split, merge or
    partition, with comparisons and swaps counted and the complexity explained
  - *Searching*: binary search with lo / mid / hi on every step (sorting the input first if needed) and linear search
  - *Graphs*: type edges like `A-B 4, B-C 2`; BFS (levels, queue), DFS (recursion stack), Dijkstra (distance
    table, shortest-path tree), Prim and Kruskal (minimum spanning tree, cycle checks) and Kahn's topological sort
    (layered drawing, cycle detection); force-directed layout, directed or undirected
  - *Trees & heaps*: binary search trees with all four traversals, AVL trees with balance factors and
    LL/RR/LR/RL rotations, and min/max-heaps built by heapify — the tree and the array side by side
  - *Stacks, queues, hashing*: push/pop/peek traces, and hash tables with chaining or linear probing
    (probe sequences, collisions, load factor)
  - *Dynamic programming*: LCS, edit distance, 0/1 knapsack and coin change as filled tables with the
    traceback path — and greedy coin change shown failing where it does
  - *Complexity*: the master theorem with the recursion tree and the work on each level, and growth rates
    from log n to n! with running times at 10⁸ operations per second
- **∑ Formulas** — type LaTeX with a symbol palette and live preview; rendered with MathJax
- **📈 Graphs** — plot up to 6 functions `y = f(x)` with ranges, grid, auto-scaling and asymptote handling
- The tools sit in four menus on the top bar: **Arithmetic** (counting, models), **Geometry** (geometry,
  trigonometry, 3D), **Algebra** (formulas, graphs, matrices, analysis, integrals, ODEs) and **Discrete**
  (number theory, combinatorics, graph theory, logic, algorithms, statistics)
- Formulas and graphs stay editable: double-click one (or use the *Edit* button) to change it
- Boards autosave to SQLite on your own server; works fully offline (no CDNs)

## Screenshots

The dialogs show a live preview; a step slider reveals the working one step at a time.

<table>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/dialog-division.png" width="430" alt="Models dialog: long division"><br><sub>Models → Division, with the step slider</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/dialog-graph-theory.png" width="430" alt="Graph theory dialog"><br><sub>Graph theory: type edges, pick a layout</sub></td>
</tr>
<tr>
<td align="center" valign="top" colspan="2"><img src="docs/screenshots/dialog-georgian.png" width="560" alt="The interface in Georgian"><br><sub>The whole interface is available in English, Russian and Georgian</sub></td>
</tr>
</table>

A selection of the pictures Zeno draws (all generated, all editable):

<table>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/models-lattice.png" width="280" alt="Lattice multiplication"><br><sub>Lattice multiplication</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/models-division.png" width="280" alt="Long division, corner layout"><br><sub>Long division, corner layout</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/models-fractions.png" width="280" alt="Fraction division, step by step"><br><sub>Fraction division, step by step</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/models-percent.png" width="280" alt="Reverse percentages (and the classic mistake)"><br><sub>Reverse percentages (and the classic mistake)</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/models-ratio.png" width="280" alt="Sharing in a ratio with a bar model"><br><sub>Sharing in a ratio with a bar model</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/models-area.png" width="280" alt="Area model for 123 × 45"><br><sub>Area model for 123 × 45</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/geometry-pythagoras.png" width="280" alt="Pythagoras with squares"><br><sub>Pythagoras with squares</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/geometry-protractor.png" width="280" alt="Protractor"><br><sub>Protractor</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/trig-circle.png" width="280" alt="Unit circle and sine wave"><br><sub>Unit circle and sine wave</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/trig-ssa.png" width="280" alt="The ambiguous case (SSA)"><br><sub>The ambiguous case (SSA)</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/analysis-limit.png" width="280" alt="ε–δ definition of a limit"><br><sub>ε–δ definition of a limit</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/analysis-taylor.png" width="280" alt="Taylor polynomials"><br><sub>Taylor polynomials</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/integral-partial.png" width="280" alt="Partial fractions"><br><sub>Partial fractions</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/ode-phase.png" width="280" alt="Phase plane of a linear system"><br><sub>Phase plane of a linear system</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/space-eigen.png" width="280" alt="Eigenvalues and eigenvectors"><br><sub>Eigenvalues and eigenvectors</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/statistics-tree.png" width="280" alt="Tree diagram and Bayes"><br><sub>Tree diagram and Bayes</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/statistics-clt.png" width="280" alt="Central limit theorem"><br><sub>Central limit theorem</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/algo-dijkstra.png" width="280" alt="Dijkstra's algorithm"><br><sub>Dijkstra's algorithm</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/algo-merge.png" width="280" alt="Merge sort"><br><sub>Merge sort</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/algo-lcs.png" width="280" alt="Longest common subsequence (DP)"><br><sub>Longest common subsequence (DP)</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/nt-sieve.png" width="280" alt="Sieve of Eratosthenes"><br><sub>Sieve of Eratosthenes</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/nt-euclid.png" width="280" alt="Euclid's algorithm as squares"><br><sub>Euclid's algorithm as squares</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/comb-pascal.png" width="280" alt="Pascal's triangle: hockey stick"><br><sub>Pascal's triangle: hockey stick</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/comb-catalan.png" width="280" alt="Catalan numbers as Dyck paths"><br><sub>Catalan numbers as Dyck paths</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/gt-petersen.png" width="280" alt="Hamiltonian path in the Petersen graph"><br><sub>Hamiltonian path in the Petersen graph</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/gt-spanning.png" width="280" alt="Spanning trees (matrix-tree theorem)"><br><sub>Spanning trees (matrix-tree theorem)</sub></td>
<td></td>
</tr>
</table>

## Run with Docker

```bash
docker compose up -d --build
```

Open http://localhost:8787. Data lives in the `data` Docker volume.

To require a password (HTTP basic auth, any username):

```bash
APP_PASSWORD=choose-something docker compose up -d --build
```

## Run without Docker

Requires Node.js ≥ 23.6 (uses built-in `node:sqlite` and native TypeScript support).

```bash
npm install
npm run build
npm start          # http://localhost:8787
```

Development (Vite hot reload on :5173, API on :8787):

```bash
npm run dev
```

Environment variables: `PORT` (8787), `DATA_DIR` (`./data`), `STATIC_DIR` (`./dist`), `APP_PASSWORD` (empty = no auth).

## Project layout

```
server/index.ts           HTTP server: /api/boards CRUD (SQLite) + static files
src/pages/HomePage.tsx    board list
src/pages/BoardPage.tsx   whiteboard, autosave, formula/graph insertion & editing
src/math/latex.ts         LaTeX → SVG (MathJax)
src/math/plot.ts          functions → SVG plot (mathjs)
src/math/models.ts        Singapore-method models → SVG (bar model, fractions, percent, number bond)
src/math/ode.ts           differential equations: slope fields, Euler, first/second order, phase planes
src/math/integration.ts   integration techniques: substitution, by parts, partial fractions, trig substitution
src/math/statistics.ts    statistics & probability pictures: data, scatter, chance, trees, distributions, CLT
src/math/chart.ts         shared plot helpers (frames, axes, curves, LaTeX header + captions)
src/math/analysis.ts      real analysis pictures: ε–N, ε–δ, secant → tangent, Riemann sums, series, Taylor
src/math/geometry.ts      plane geometry: measurements, classification, drawing
src/components/GeometryDialog.tsx  the drag-the-points geometry editor
src/math/percratio.ts     percentages and ratios: steps + percent bars and unit bar models
src/math/fracop.ts        fraction arithmetic: steps (lcm, cancelling, reciprocal, gcd) + bar / area / fitting pictures
src/math/division.ts      long division: bracket, corner and short layouts, decimals and repeating decimals
src/math/multiply.ts      multiplication models (groups, array, number line, area, lattice) → SVG
src/math/placeValue.ts    base-ten blocks: layout, trading rules, board image
src/components/PlaceValueMat.tsx  the drag & drop place-value mat
src/math/fraction.ts      exact rational arithmetic
src/math/algo.ts          algorithms: specs, presets, words (renderers in algoArrays.ts and algoGraphs.ts)
src/math/algoArrays.ts    sorting, searching, stacks/queues/hashing, DP tables, complexity + cell/table helpers
src/math/algoGraphs.ts    graph algorithms (BFS, DFS, Dijkstra, Prim, Kruskal, topological sort), BST/AVL, heaps
src/math/graphtheory.ts   graph theory: properties, Euler, Hamilton, colouring, walks, spanning trees
src/math/logic.ts         logic: parser, truth tables, equivalence, Karnaugh maps / minimal forms, circuits, arguments, Venn
src/math/logicPuzzles.ts  constraint boards (bins / slots, sweep, "if …") and truth-teller / liar puzzles
src/math/combinatorics.ts counting, Pascal's triangle, stars and bars, inclusion–exclusion, Catalan/Stirling/partitions
src/math/numtheory.ts     number theory: sieve, factorization, gcd/Bézout/Diophantine, modular arithmetic, CRT, bases
src/math/trig.ts          trigonometry: unit circle, right triangles, laws of sines/cosines, graphs, equations
src/math/vectorspace.ts   span, subspaces, coordinates, Gram–Schmidt, eigenvalues (exact) + ℝ²/ℝ³ pictures
src/math/matrix.ts        matrix operations → LaTeX with worked steps
src/math/transform.ts     2×2 matrix as a plane transformation → SVG
src/three/                3D: spec + formulas (spec.ts), scene building (build.ts), viewer & PNG snapshot (viewer.ts)
src/i18n.tsx              en / ru / ka strings
```

## Roadmap ideas

- Practice mode: exercise bank by topic with auto-checked answers (numeric / symbolic equivalence)
- Spaced repetition of mistakes and key formulas
- Progress tracking per topic
- Share a board read-only / real-time collaboration (Yjs)
- Parametric & implicit plots, points and tangent lines, geometry tools
