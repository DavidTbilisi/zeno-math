# Zeno

*Math from zero to advanced — every small step counts.*

Zeno's paradox says you need infinitely many small steps to cross a room — and yet you get there.
Zeno is a free, open-source, self-hostable **math whiteboard for learning on your own**, from
counting with bar models and fractions all the way to graph theory, combinatorics, number theory, functions and curve sketching, polynomials and the binomial theorem, logarithms, sequences and series, circle theorems, similarity, transformations, surface area and volume, constructions and loci, coordinate geometry, vectors, lines and planes, trigonometry and trig identities, real analysis, derivatives, integration techniques and their applications, differential equations, numerical methods, statistics with confidence intervals and hypothesis tests, linear algebra, tensors for AI, algorithms & data structures and 3D geometry — with practice questions that check your answers and worksheets for the board.
UI in English, Russian and Georgian.
The front page for schools is published at **[davidtbilisi.github.io/zeno-math](https://davidtbilisi.github.io/zeno-math/)**, with free practice beside it at **[/practice](https://davidtbilisi.github.io/zeno-math/practice/)** (built by `npm run build:landing`, deployed by the Pages workflow; no server there, so no class study).

![A Zeno board: lattice multiplication, the unit circle, a Hamiltonian path in the Petersen graph, fraction division, ε–δ and Pascal's hockey stick](docs/screenshots/board.png)

*Every picture on the board is a live, editable object — double-click it to change the numbers. See [more screenshots](#screenshots).*

- Infinite whiteboard (Excalidraw): freehand, shapes, text, arrows, images, export to PNG/SVG
- **🧮 Place-value mat (Singapore method, concrete stage)**, the Place value tab of Models: drag base-ten blocks
  (hundreds, tens, ones) onto a Hundreds | Tens | Ones mat — mouse or touch
  - Trade by dragging: a ten onto Ones breaks into 10 ones; a one onto Tens groups 10 ones into a ten
    (same for hundreds); drag off the mat to remove. Ones sit in ten-frames so tens are easy to see
  - Shows the number in expanded form (`125 = 100 + 10 + 15` flags that regrouping is needed)
  - 🎲 Challenge: "Make 347" with the total hidden, and a Check button (correct / too many / not enough)
- **🧠 Mental math** — Vedic speed mathematics, Trachtenberg and the Major System (after the Neural OS notes)
  - *Near a base*: one generator, (B + a)(B + b) = B·(B + a + b) + a·b — the classic two-column layout (offsets, the
    cross, the product, carries and borrows) and an area picture of why it works; any base (10, 100, 50, …)
  - *Division*, three ways, with every quotient and remainder checked:
    - *near a base* (Nikhilam, "transpose and apply") for divisors just below 10ᵏ: each quotient digit times the
      complement (11 for 89) is added under the next columns, a line splits off the remainder columns, carries and a
      final adjustment give the answer
    - *the flag* (Dhvajanka) for any divisor: divide by the first digit only and subtract flag × the previous quotient
      digits as you go, with the digits that must be taken smaller marked — for two-digit divisors this is also
      Trachtenberg's fast method
    - *Trachtenberg's table*: the multiples 1–10 built by adding, with a digit-sum check column and the 10× row as a
      seal, then look up and subtract; the answer verified by digit sums
  - *Divisibility*: the tests for 2–11 and 13 (last digits, digit sums, alternating sums, the shrinking rules for 7
    and 13) worked on your number, each verdict checked
  - *Reciprocals*: 1/n by long division of the remainders — where the cycle starts and how long it is; for cyclic
    numbers like 1/7 and 1/17 every k/n as a rotation of the same cycle
  - *Digit-sum check*: casting out nines for +, −, ×, ÷, with nines and pairs that make 9 struck out — and an
    example of a wrong answer it cannot catch (swapped digits)
  - *Square and cube roots* of perfect powers: the last-digit table gives the last digit(s), the bracket between
    consecutive tens (or cubes) gives the first, the midpoint breaks the tie
  - *Cubing* two-digit numbers (Anurupya): a geometric progression a³, a²b, ab², b³, the middle terms doubled, then
    the columns added with carries
  - *Magic squares* of odd order by the walk (middle of the right column, south-east, west when blocked), all sums shown
  - *Major System*: digits ↔ consonants (Latin, or the Russian БЦК), with your words decoded back to check each pair
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
- **⊙ School geometry** — type what you know; every answer comes with its reason and a figure drawn to fit
  - *Circle theorems*: the angle at the centre, the angle in a semicircle, angles in the same segment, cyclic
    quadrilaterals, tangent and radius, two tangents from a point, the alternate segment, the perpendicular from the
    centre to a chord, intersecting chords and tangent–secant (AE × EB = CE × ED, PT² = PA × PB). Each angle or length
    is found with its reason (isosceles triangle, angles in a triangle, Pythagoras, SOH CAH TOA…), unknowns such as
    ∠A = 2x, ∠C = x + 30 are solved for, and the figure is drawn to the angles found: given in blue, found in green,
    still unknown in red
  - *Similar & congruent*: ABC ~ DEF with the scale factor, every missing side and angle, x in the sides, the A-shape
    (DE ∥ BC, AD + DB = AB) and the X-shape; ABC, DEF says which test proves it — SSS, SAS, ASA, AAS, RHS for
    congruence, AA, SSS, SAS for similarity — with tick marks and arcs on the matching parts, and why two sides and a
    non-included angle are not enough; and lengths 2 : 3 → areas 4 : 9 → volumes 8 : 27 in any direction
  - *Transformations*: translate by a vector, reflect in any line (y = x, x = 2, y = −x + 3), rotate about any centre,
    enlarge by any factor (fractional and negative too), one after another, with the rule (x, y) ↦ (−y + 3, x + 1),
    each corner's image and the construction lines on a grid; two in a row are named as one when they can be; and
    object → image finds the single transformation — the centre and angle of a rotation from perpendicular bisectors,
    the centre and factor of an enlargement from rays, the mirror line, or the vector
  - *Surface area & volume*: cube, cuboid, triangular prism, cylinder, cone, sphere, hemisphere, pyramid and frustum,
    exact in π (90π ≈ 282.74 cm³), the slant height by Pythagoras, a missing length from the volume or the surface
    area (V = 36π gives r = 3), solids stacked with + (the touching faces are taken off) or with a hole through
    them, a drawing with the measurements and the net with the area of each face
  - *Constructions & loci*: the perpendicular bisector, the angle bisector, the perpendicular from or at a point, a
    triangle from three sides, and angles of 60°, 30°, 90° and 45° — compass arcs, numbered steps and the line's
    equation; loci (r from a point or a segment, equidistant from two points or two lines, closer to A than B, inside
    a shape) joined with "and", the region that meets every condition shaded and where the loci meet marked
- **xy Coordinate geometry** — type points, lines and circles; exact fractions and surds, every step named, on a grid
  with equal units
  - *Points*: Δx and Δy as the legs of a right triangle, the distance by Pythagoras (√13, 8√5/5), the midpoint, the
    gradient, and the point dividing AB in a ratio
  - *Equation of a line*: from an equation in any form, two points, a point and m, or m and c — rearranged to
    y = mx + c, the intercepts, the general form ax + by + c = 0, and the rise/run triangle on the graph
  - *Parallel & perpendicular*: the parallel and the perpendicular through a point (m₁·m₂ = −1), the foot of the
    perpendicular with its right angle, and the distance |ax₀ + by₀ + c| / √(a² + b²)
  - *Where lines meet*: substitution when one line is y = …, elimination otherwise; parallel and coincident lines
  - *Circles*: x² + y² + Dx + Ey + F = 0 by completing the square, or centre and radius (or a point on it) to the
    equation; a point inside, on or outside, the tangent at a point, and a line cutting, touching or missing the circle
    by the discriminant, with exact intersection points
  - *Shapes*: side lengths and gradients, parallel sides (arrow ticks) and right angles, the name (right-angled
    isosceles triangle, square, rectangle, rhombus, parallelogram, trapezium, kite) and the area by the shoelace
    formula, drawn as the criss-cross it is named after
- **↗ Vectors** — in 2D and 3D, exactly (fractions and simplified surds); 2D on a grid, 3D in a view turned so
  that no arrow, line or plane is seen end-on, with dashed drops to the floor to show depth
  - *Vectors*: name vectors and points (a = (2, 1, −1), 3i − 2j + 6k, A(1, 2, 0)) and type an expression (2a − 3b,
    AB, AB + BC): written out, scaled, added, drawn nose to tail; the length, the unit vector, parallel vectors
  - *Dot product*: a·b, the angle (exact when it is a whole number of degrees: 60°, 120°), acute/right/obtuse,
    the angle ABC from three points, and the scalar and vector projection drawn as a shadow
  - *Cross product*: by the 3×3 determinant expanded along i, j, k and checked against both vectors, the areas of
    the parallelogram and the triangle, and the scalar triple product with the volumes of the box and the tetrahedron
  - *Lines*: from two points, r = a + t·d or (x − 1)/2 = (y + 1)/3 = z — vector, parametric and Cartesian equations;
    the foot of the perpendicular from a point and the distance; two lines meeting, parallel or skew (with the
    shortest distance and the common perpendicular), and the angle between them
  - *Planes*: from ax + by + cz = d, r·n = d, a point and a normal, three points or r = a + λu + μv; the
    distance and foot from a point, where a line meets a plane (or why it doesn't) and the angle, and two planes:
    their line of intersection and the angle, or the gap between parallel planes
- **⚖ Equations & polynomials** — school algebra one line at a time, in exact fractions, every step labelled with what
  was done to both sides
  - *Linear equations*: take the smaller x-term from both sides, then the number, then divide; a balance scale with
    x-bags and unit weights when the numbers are small, the crossed-out items being the ones taken from both pans;
    "every number" and "no solution" cases; a check by substitution
  - *Inequalities*: the same steps, with the sign flipping (in red) when dividing by a negative; two-sided ones such as
    −3 < 2x + 1 ≤ 7 on all three parts; the answer on a number line with open or filled dots
  - *Expand brackets*: the grid method — every term times every term, like terms collected in the colour of their power;
    up to three brackets, `(x + 1)^3` and a number in front
  - *Factor*: common factor (and x) first, then the ac method — the table of pairs p·q = ac with the one adding to b
    ticked, the middle term split, grouped, and the common bracket; differences of squares and perfect squares named;
    "doesn't factor" with the discriminant when no pair exists
  - *Quadratic equations*, four ways: factoring and the zero product, completing the square (drawn as a square with
    two strips and the missing corner), the formula with the discriminant (exact surds, complex roots pointed to the
    Complex numbers tool), and vertex form with the parabola, vertex, axis, roots and y-intercept
- **x³ Polynomials** — beyond quadratics, every number exact
  - *Division*: long division set out as on paper (the quotient over the bar, each product subtracted, the next term
    brought down, 0x² for a missing power), synthetic division for a linear divisor (also bx − a), dividend =
    divisor × quotient + remainder, the fraction form, and the remainder theorem f(a) as a check
  - *Factor theorem*: f(x) with unknown coefficients and conditions — "(x − 2) is a factor", "remainder −12 when
    divided by (x + 1)", f(1) = 0 — each substituted into an equation, solved together by elimination (labelled
    (1) + (2), 2×(1) − (2)), f written out and factorised, the conditions as points on the graph; with no unknowns,
    the remainders; with no conditions, a search through the ±p/q candidates
  - *Factor & solve*: cubics and quartics — x or a number taken out, a hidden quadratic (x⁴ − 5x² + 4, x⁶ − 9x³ + 8)
    by u = xᵏ, otherwise the rational root candidates tried one by one and each root divided out (synthetic division
    tables), then factorising or the quadratic formula with surds, and numbers when no rational root is left;
    repeated roots named; inequalities f(x) > 0 with a sign table (one row per factor) and the answer as inequalities,
    as intervals and on the graph
  - *Binomial expansion*: (2x − 3)⁵ term by term from Σ C(n, r)aⁿ⁻ʳbʳ with Pascal's triangle; one term (x³ in
    (2x − 3)⁸, the term independent of x in (x + 2/x)⁶) from the general term; the first few terms and an estimate
    such as 1.02⁸; any other power — (1 + 2x)⁻¹, √(4 + x), 1/(1 − 3x)² — as the binomial series, aⁿ taken out, with
    the interval of validity and a graph of the series hugging the curve inside it
  - *Line & curve*: one linear and one other equation (parabola, circle, ellipse, hyperbola xy = 6, a cubic) —
    make x or y the subject, substitute, collect, the discriminant decides between two points, a tangent and none,
    exact points (surds included) and both graphs with equal units
  - *Partial fractions*: linear, repeated and quadratic factors in the denominator, an improper fraction divided first;
    the identity, the letters found by putting x = each root (cover-up) and the rest by comparing coefficients, and a
    check at a number
- **xⁿ Powers, roots & logs** — exact wherever the answer is exact, every step named
  - *Index laws*: brackets opened ((ab)ⁿ, (a/b)ⁿ, (aᵐ)ⁿ, ⁿ√a = a^(1/n)), powers of the same base added or subtracted,
    a⁰ = 1 and a⁻ⁿ = 1/aⁿ, 8^(2/3) = (∛8)² = 4; with whole powers every factor is drawn as a chip, and chips above
    and below the line cancel; a check by substituting numbers for the letters
  - *Scientific notation*: a number into standard form and back, with the decimal point hopping place by place;
    × ÷ (multiply the numbers, add the powers) and + − (both with the larger power), then back to 1 ≤ a < 10
  - *Surds*: the largest square (or cube) factor out of the root, drawn as pairs of prime factors leaving the root sign;
    expanding brackets, √a·√b = √(ab), collecting like surds, and rationalising with √r/√r, ∛r² or the conjugate
  - *Logarithms*: log_b x as "which power of b gives x?" — written as powers of a common base (log₉ 27 = 3/2), the
    power, product and quotient laws, change of base with the two whole powers it lies between, and y = log_b x
    mirrored from y = bˣ in the line y = x
  - *Exponential equations*: a common base and equal powers (9ˣ = 27ˣ⁻¹), or taking logs (2²ˣ = 3ˣ⁺¹); log equations
    combined into one log, the domain worked out first, and a root that makes an argument negative thrown out
- **f(x) Functions & graphs** — exact for polynomials and fractions of them, numerical (and said so) for the rest;
  |x| works everywhere (`|x − 2|`, `abs(x)`)
  - *Domain & range*: every restriction found and solved — denominators, even roots, logs, arcsin, tan's gaps
    (x ≠ π/2 + kπ) — and the range from the stationary values, the values at closed ends and the limits at open
    ones (1/(x² − 1) → (−∞, −1] ∪ (0, ∞)); the domain drawn along the x-axis and the range along the y-axis
  - *Composite & inverse*: fg(x) and gf(x) with their domains, fg(2) through two function machines; f⁻¹ by undoing
    the layers one at a time (subtract, divide, square, take logs …), by collecting y for (ax + b)/(cx + d), or by
    completing the square — refused, with a suggested restriction, when f is not one-to-one; f and f⁻¹ mirrored in y = x
  - *Transformations*: y = a·f(b·x + c) + d split into its steps in the right order (stretch, reflect, translate),
    y = |f(x)| and y = f(|x|), one small picture per step with the key points carried along
  - *Curve sketching*: factorised, holes, intercepts, vertical asymptotes with the side each branch goes, horizontal
    or oblique asymptotes (by division) and where the curve crosses them, stationary points exactly (2 ± √3) with
    their type, and sign charts of f and f′ drawn over the graph
- **aₙ Sequences & series** — exact fractions while they stay small; the terms and the partial sums drawn side by side
  - *Find the rule*: type the first terms; the difference table finds linear, quadratic and cubic rules (the term
    before the first, take away an², Newton's forward differences), constant ratios give a geometric rule, otherwise
    a recurrence of order 1 or 2 (Fibonacci); the next terms, any term (u50) and which term a value is (= 401)
  - *Arithmetic*: from terms or any two facts (a, d, u₅ = 17, S₁₀ = 155), solved together and checked against the
    rest; the nth term and Sₙ simplified, which term a value is, the first n with uₙ or Sₙ past a bound, and the sum
    as two copies (one upside down) filling an n × (first + last) rectangle
  - *Geometric*: from terms, a and r, two terms (r as a root, with −r when it fits too), S∞ or a sum; the nth term,
    Sₙ, the sum to infinity with the partial sums closing in on it, and the first n past a bound by logarithms
  - *Σ notation*: `sum k=1..20 (3k − 2)`, `sum r=1..n r(r + 1)` or `sum k=1..∞ (1/2)^k` — polynomials split and
    summed by the standard results for Σk, Σk², Σk³ (up to k⁶) and factorised (n(n + 1)(n + 2)/3), sums that start
    later as a difference, powers as geometric series, fractions like 1/(k(k + 1)) by partial fractions with the
    cancelling shown line by line, and series written out with dots (1 + 4 + 7 + … + 100, 8 − 4 + 2 − …)
  - *Recurrence*: `u(n+1) = u(n)/2 + 3; u(1) = 2` — the first steps substituted, fixed points (exactly for
    polynomials) with the slope deciding whether they attract, a closed form for linear ones, a cobweb diagram, and
    whether the terms converge, diverge, cycle or never settle; second-order linear ones by the characteristic
    equation, with surd roots (Binet's formula for Fibonacci)
- **ℂ Complex numbers** — type z as `3+4i`, `2e^(iπ/3)`, `2∠150°` or `sqrt(-4)`; exact values where they are simple
  (√2/2, π/3), and every picture in the complex plane
  - *Forms*: a + bi ↔ r(cos θ + i sin θ) ↔ re^{iθ}, with |z|, the argument from arctan and the quadrant, the conjugate
    and 1/z
  - *Operations*: + − × ÷ step by step (i² = −1, multiplying by the conjugate) — adding as a parallelogram,
    multiplying and dividing as lengths multiplied / divided and angles added / subtracted
  - *Powers*: De Moivre's theorem with the angle reduced mod 2π, the spiral of powers, and the cycle of iⁿ
  - *Roots*: all n-th roots as the corners of a regular polygon on a circle
  - *Quadratics*: a negative discriminant, the conjugate pair of roots next to the parabola that never meets the
    x-axis, and Vieta's check
  - *Euler's formula*: e^{iθ} = cos θ + i sin θ on the unit circle, and e^{iπ} + 1 = 0
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
  - *Truth trees*: the premises and the negated conclusion broken into their parts, ∧-like formulas stacked and
    ∨-like ones split, every line numbered with the row and rule it came from and ticked once used; branches close
    (✗, with the two rows) or stay open (○, with the row of the truth table they give). Leave the premises empty to
    test a tautology, or the conclusion empty to test whether the formulas can all be true
  - *Syllogisms*: two premises in plain words (All / No / Some / Some … not, in English, Russian or Georgian) or
    just a mood and figure (`EIO-2`, `Festino`); the terms found and the major premise put first, three-circle Venn
    diagrams of the premises and the conclusion with distributed terms underlined, the medieval name, the rule that
    is broken (undistributed middle, illicit major / minor, exclusive premises, existential fallacy), and what
    follows when no conclusion is given; read the modern way (15 valid forms) or Aristotle's (no empty terms, 24)
  - *Strengthen / weaken*: the argument written with letters (a legend says what each means), premises, background
    links and a conclusion; an argument map with the unstated premise found automatically (the simplest extra premise
    that makes it valid), a pattern card (what people say → what to do, correlation → cause, sample → everyone,
    analogy, plan → goal, criterion → decision) with its typical gap, strengtheners and weakeners, and every answer
    option judged — closes the gap, needed, strengthens, weakens, defeats, irrelevant or denies a premise — by how it
    moves the share of cases where the conclusion holds
  - *Constraint boards*: grouping (bins with capacities) and ordering (slots) puzzles in a compact notation —
    `A@Chveli`, `C=G`, `A≠B`, `X<Y`, `[X·Y]`, `X∉m`, `F@Kala → E@Chveli` — with every conditional written
    together with its contrapositive, what is forced and ruled out before any question, an "if …" assumption worked
    on a copy of the board, and a sweep of the answer options showing which constraint kills each one; options
    that are statements (`C@Kala`) are marked must be true / must be false / could be / fixes the whole board
  - *Logic grids*: matching puzzles of two to four categories (owners, years, breeds, names), the categories and
    clues typed in a small notation — `Anita = beagle`, `Anita ≠ 2009`, `Molly < Toby`, `Riley = beagle + 1`,
    `Barbara ≠ beagle ≠ 2009` (all different), `{Douglas, Sam} = {2006, collie}` (one each), joined with and, or,
    not, → — and worked out a step at a time the way a person does: "only one left" in a row, copying a ● pair's
    marks across, each clue on its own and then with the marks so far, and, when nothing moves, supposing a pair and
    finding the clue it breaks. Each step lights its marks on the staircase grid, with the candidates still open
    underneath, by year or price when there is a category of numbers; at the end, solved, or how many answers the
    clues allow
  - *Mill's methods*: finding a cause three ways. Agreement and difference: a table of cases (`Ann: oysters, salad,
    cake -> sick`), drawn with a ● for each factor, the column every case with the effect shares (blue; green when
    it is also in none of the others, the joint method) and brackets joining two cases that differ in one factor
    only, with what is necessary, what makes the difference and what is sufficient so far — and Mill's warning that
    a factor nobody listed fools them all. Concomitant variation: rows of numbers, each factor drawn against the
    effect with its correlation, and the warning that two factors moving together may share a third cause (ice
    cream and drowning). Residues: the whole less the known parts as a bar model, the rest left to the factor named
  - *Square of opposition*: one statement (All / No / Some / Some … not, in any of the three languages, or just A,
    E, I, O) given true or false, and the square: all four statements on its terms, each true, false or open, with
    the link that settles it — contradictories, contraries, subcontraries, subalterns — and, read the modern way
    where a term may be empty, only the diagonals left standing. Under it, the converse, obverse and contrapositive,
    with what still follows by limitation (All S are P → Some P are S). Every verdict comes from the Venn regions of
    the two terms
  - *Truth-tellers & liars*: Smullyan's islands solved by checking X ↔ (what X says) in every row
  - *Sets*: Venn diagrams (1–3 sets) of ∪ ∩ ∖ Δ ′ expressions, two expressions compared, and x ∈ … as logic
  - The examples include the 2025 NAEC master's exam in logical reasoning (variant I): the grouping and
    scheduling scenarios (items 12–17), the statues (8), the truth-teller (11), strengthen / weaken (5, 9) and the
    deduction items
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
  - *Compass*: the unit circle as a compass — North/South is the sign of sin, East/West the sign of cos, and each
    quadrant is remembered by its two neighbours. Cue words per direction (your own, or the language's default:
    nose / eat cookies / soup / wet milk), the sector θ lands in with the signs of sin, cos and tan, and the compass
    bearing of the same direction (clockwise from North) next to the angle (anticlockwise from East). Or label the
    quadrants with diagonal images of their own and the feeling that carries the signs (straw — clean, all +; sick
    nose — mixed; man in soup — heavy, all −; cookie in milk — mixed, calmer), plus a gaze drill
  - *Right triangle*: SOH CAH TOA from any two of a, b, c, θ — every step, given parts in blue
  - *Solve a triangle*: SSS and SAS with the law of cosines, ASA/AAS with the law of sines, and the ambiguous
    SSA case — two triangles, one, or none — with areas ½·ab·sin C
  - *Graphs*: y = A·sin/cos/tan(B(x − C)) + D against the base graph, with amplitude, period, phase shift and
    midline marked, tan asymptotes, degrees or radians
  - *Equations*: sin/cos/tan x = k — the principal angle, all solutions in one turn on the unit circle and the graph,
    and the general solution (x = ±150° + 360°n)
- **≡ Trig identities** — exact numbers are sums of surds, and every line of a proof is checked numerically
  - *Compound angles*: exact values from the compound, double and half angle formulas — sin 75° = sin(45° + 30°) =
    (√6 + √2)/4, tan 15° = 2 − √3 by rationalising, cos 22.5° = √(2 + √2)/2 with its sign from the quadrant; given
    ratios (sin A = 3/5, A acute; cos B = −5/13, B obtuse) the other ratios by sin² + cos² = 1 and the quadrant, then
    sin(A ± B), cos 2A, tan(A + B) …; or an expansion (sin 3x = 3 sin x − 4 sin³x, cos(x + 60°)) — with the unit
    circle and the quadrant triangles
  - *R sin(x + α)*: a sin x + b cos x as one wave — compare coefficients, R = √(a² + b²), tan α (exact when α is a
    multiple of 15°), in any of the four forms, the largest and smallest values and where they are, and
    a sin x + b cos x = k solved over an interval; the R–α triangle and the two waves adding up to one
  - *Prove an identity*: each side is rewritten in sin and cos of one angle (compound and double angles, sec, cosec,
    cot), put over one fraction, then sin² + cos² = 1 (used five ways) and cancelling common factors; of all the
    routes, the shortest one where the two sides meet is shown, starting from the longer side, with the formulas
    used. A false identity gets a counterexample and the two different graphs
  - *Equations*: 2cos²x + 3 sin x = 3 → a quadratic in sin x, factorised; sin 2x = cos x → cos x(2 sin x − 1) = 0;
    3 tan²x − 2 sec x = 2 → a quadratic in cos x; 2 sin²x = sin x cos x → ÷ cos x for tan; sin(2x − 30°) = ½ by
    θ = 2x − 30° over the stretched interval; sin x + √3 cos x = 1 by the R-form — every solution in the interval,
    exact when possible, in degrees or radians, with values where a side has none thrown out, and numerically
    (and said so) when no identity helps
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
- **f′ Derivatives** — a small symbolic engine opens every pending derivative (u)′ one rule at a time, names the rule,
  simplifies, and checks the answer against a numerical derivative
  - *First principles*: f(x + h) expanded, f(x) taken away, ÷ h, h → 0 — for polynomials — with the secants through x₀
    closing in on the tangent
  - *Rules*: sum, constant multiple, power, product, quotient and chain rules, eˣ, aˣ, ln, log_b, all six trig functions,
    arcsin / arccos / arctan, sinh / cosh / tanh and xˣ; f and f′ drawn together
  - *Chain rule*: the function split into layers y = f(u), u = g(v), …, each differentiated, multiplied along a drawn
    chain x → v → u → y, and x put back
  - *Tangent & normal*: f(a) and f′(a) exactly where possible (also at π/2), the tangent y − f(a) = f′(a)(x − a) and the
    normal with gradient −1/f′(a), on equal units so the right angle shows
  - *Stationary points*: f′(x) = 0 solved exactly (rational roots, then the formula with surds such as 1 ± √2),
    maximum / minimum / point of inflection by the second derivative (or the sign of f′ when f″ = 0), a sign chart
    with ↗ ↘, and where f is increasing or decreasing
- **∇ Several variables** — calculus in x and y, the derivatives taken by the same rule-by-rule engine with the other
  letter held constant (each pending one written ∂/∂x (u)), every value checked by small steps
  - *Partial derivatives*: ∂f/∂x and ∂f/∂y step by step, their values at a point, and the two slices of the surface
    through it, f(x, b) and f(a, y), each with its tangent: a partial derivative is the slope of a slice
  - *Gradient*: ∇f = (∂f/∂x, ∂f/∂y), its value and length at the point, on a contour map with equal units: the arrow
    points uphill at right angles to the contour through the point, with the field of gradients around it
  - *Chain rule*: f(x, y) with x(t) and y(t), df/dt = ∂f/∂x · dx/dt + ∂f/∂y · dy/dt, drawn as a computation graph
    t → x, y → f with each edge's local derivative; the two paths multiplied along and added, as backprop does
  - *Jacobian*: a map (x, y) ↦ (u, v), its matrix of partial derivatives and det J; a small square of grid lines and
    where the map sends it, beside where J sends it (a parallelogram |det J| times the area, flipped when det J < 0)
  - *Hessian*: the second partial derivatives (the mixed ones agree), H at the point, its eigenvalues as curvatures
    along their eigenvectors on a contour map, minimum / maximum / saddle / undecided, and at a minimum the largest
    rate gradient descent can use, η < 2/λ₁
  - *Convexity*: f is convex where H is positive semidefinite; the smaller curvature checked over the map, where it is
    negative shaded, every stationary point found and named (the global minimum, local minima, saddles, maxima), the
    dashed chord between two minima with how far f rises above it, and a note when f goes lower than its one minimum
  - *Lagrange multipliers*: f on a constraint g(x, y) = c; ∇f = λ∇g written out and solved (Newton's method on x, y
    and λ), the largest and smallest values with λ, and on the map the constraint, the level curves of f that just
    touch it, and ∇f beside ∇g; λ as how fast the best value grows with c
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
- **∫⌒ Applied calculus** — exact for polynomials (surd limits included), standard antiderivatives otherwise, and every
  answer checked by Simpson's rule
  - *Area*: under a curve or between two — where they meet, which is on top, each piece integrated, pieces below the
    axis counted as positive (with the signed integral beside it), e.g. 8√2/3 between x² and 2; exact at π and e too
  - *Volumes of revolution*: discs, washers (two curves) and shells about the y-axis, the answer as a multiple of π,
    and the solid drawn with its cross-sections
  - *Motion*: s(t) → v and a, when it is at rest, positions, displacement against distance travelled, graphs of s, v
    and a, and the path drawn on a line
  - *Optimisation*: the open box from a sheet, the fence by a river, the can of least metal and the nearest point on a
    parabola — the function, its range, f′ = 0, the second-derivative test and a picture
  - *Related rates*: the sliding ladder, the balloon, the filling cone and the ripple — the linking equation,
    differentiated with respect to t, and the numbers put in
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
- **≈ Numerical methods** — every value in a table, every step drawn, and the ways each method can fail
  - *Change of sign*: f(a) and f(b), a decimal search one place at a time and the bounds check that proves a root
    to k d.p. (f(2.085) < 0 < f(2.095) ⇒ α = 2.09); with no interval, the whole numbers from −10 to 10 are tried; it
    warns when a sign change comes from a break (1/(x − 2)) or when the signs agree but there is a touching root or
    a hidden pair of roots
  - *Bisection*: the table of aₙ, bₙ, mₙ and f(mₙ), the shrinking intervals drawn, the error bound (b − a)/2ⁿ⁺¹, and
    stopping when both ends round alike; *false position* cuts where the chord crosses instead
  - *Newton–Raphson*: f′(x) found symbolically, the first step substituted, the table with the error |xₙ − α| (the
    digits double), the tangents drawn down to the axis; a flat tangent, a cycle (0 → 1 → 0) or running away
    (∛x) is recognised; the *secant method* with two starting values
  - *Iteration*: x = g(x) (or xₙ₊₁ = …) with the staircase or cobweb on y = x, g′(α) and the |g′(α)| < 1 test, and
    a check that the limit solves the original equation — so a rearrangement that diverges is explained
  - *Trapezium & Simpson*: the strip width, the ordinates, the rules with the numbers put in (mid-ordinate too),
    the exact integral when there is one, the error and its percentage, over- or underestimate from the sign of f″,
    and with n = 2, 4, 8, … the observed order of the error (h² and h⁴); also from a table of values
  - *Numerical f′(x)*: forward, backward and central differences against the exact derivative, the chords drawn
    around the tangent; several h show error ∝ h and ∝ h², and where round-off takes over
- **🤖 Math for AI** — the maths that machine learning is written in: tensors, what is done to them, gradient descent, backpropagation, softmax with cross-entropy, embeddings with cosine similarity, and SVD with PCA
  - *Tensors* as NumPy and PyTorch see them, a box of numbers with a shape: type a number, a list `[5, 3, 7]`, a
    nested list `[[1, 2], [3, 4]]` or a shape `2x3x4` (filled 1, 2, 3, … in memory order; `shape 5` for a vector).
    A scalar is drawn as one cell, a vector as a row, a matrix as a grid with its rows and columns as axis 0 and
    axis 1, an order-3 tensor as its slices T[0], T[1], … beside the box they stack into, and an order-4 one (a
    batch) as rows of slices. The header writes it as T ∈ ℝ²ˣ³ˣ⁴ with the number of entries; the captions give the
    order (how many indices pick out one number), the shape, the strides of row-major storage, and for a matrix its
    rank, kept apart from its order (both get called "rank"). A column vector written as a 3 × 1 matrix has order 2,
    the list has order 1. `; T[1, 2, 3]` picks out an entry and shows where it sits in memory (1·12 + 2·4 + 3·1 =
    23). A list that is not a full box (rows of different lengths) is refused with the reason
  - *Tensor operations*, each drawn before and after with its line of code: a tensor and, after `;`, one of
    `reshape 4x6` (`-1` for the length to work out), `flatten`, `T`, `transpose 0 1` (swap two axes), `permute 2 0 1`
    or `sum`, `mean`, `max`, `min` with an axis and `keepdims`; or two tensors joined by `+`, `−`, `*`, `/` or `@`.
    Reshape keeps every number where it is in memory and gives it new strides; permute moves the strides with the
    axes, and when they stop being row-major the result is shown not to be contiguous, with the places in memory a
    row-by-row read visits (an image HWC → CHW with `permute 2 0 1`). A reduction uses up its axis, and keepdims
    keeps it with length 1 to broadcast back. Broadcasting lines the shapes up from the right and draws each operand
    stretched to the result, the copies pale (really stride 0); shapes that cannot broadcast say which lengths clash.
    `@` multiplies rows by columns, takes a vector as a row on the left and a column on the right (two vectors give
    the dot product), and multiplies a batch matrix by matrix with the batch axes broadcast. One entry of the result
    is worked out (`; [1, 0]` picks which), with the entries that make it up picked out in the inputs
  - *Gradient descent* on a function of x, or of x and y: `(x - 3)^2; start 0; rate 0.1`, with up to three rates
    side by side (`rate 0.02, 0.4, 1.05`), `steps` and `momentum 0.9`. The gradient is found symbolically and the
    rule written out; in one variable the steps are drawn on the curve, in two across the level curves (equal scales,
    so −∇f crosses them at right angles), with a table of the first steps and the first one worked out. Each rate's
    path is judged: it settles (the gradient under 0.1 % of where it started), is still on its way, overshoots or
    zigzags, bounces at the edge, runs away, or stops on a maximum or a saddle point because the slope is flat there;
    a lower point is found when it settled in a local minimum. From the curvature where it settled (or anywhere, for
    a quadratic) the largest rate is given, η < 2 / f″, or 2 over the Hessian's largest eigenvalue, and a long
    valley's steep-to-gentle ratio explains the zigzag that momentum smooths out
  - *Backpropagation*: an expression in named inputs and their values, `(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10`
    (names are a letter with an optional number, so `w1x1` is w1 times x1; `sigmoid`, `relu`, `tanh`, `exp`, `ln`,
    `sin`, `cos`, `sqrt`, `abs`), drawn as its computational graph left to right: each input once however often it
    is used, constants folded into their operation (`· + 3`), every node with its value worked out forwards and its
    gradient ∂L/∂node backwards, every edge with its local derivative. One input's chain rule is written out along
    each path from it to L and added up where it is used more than once (`; explain w`), with the path drawn in
    orange and checked by a central difference; a dead ReLU or a saturated sigmoid is pointed out; and
    `; learn w b; rate 0.01` takes one step of gradient descent with the new values and the new L
  - *Softmax & cross-entropy*: scores such as `[2, 1, 0.1]`, with `labels cat, dog, bird`, a `target` (a class by
    number or label, or a distribution such as `[0.8, 0.1, 0.1]`) and up to three temperatures
    (`temperature 0.5, 1, 5`). One row per class: its score, e^(z − max), its probability as a bar over the target's
    dashed one, and the gradient p − y as a signed bar. The captions say why the largest score is taken off first
    (and when e^z would overflow without it), that two classes are the sigmoid of the difference, how temperature
    sharpens or flattens, the cross-entropy worked out against a uniform guess (ln k), a confident mistake, and for a
    soft target the entropy H(y) it can never go below and the KL divergence above it
  - *Embeddings & cosine similarity*: named vectors such as `cat [0.9, 0.8, 0.1], dog [0.85, 0.75, 0.2]` (or the rows
    of a list, called a, b, …), up to 8 of up to 12 entries, drawn as rows of cells shaded by value with their lengths.
    One pair is worked out (`compare cat dog`, or the first two): the dot product term by term, cos θ = a · b / (|a| |b|)
    with the angle and what it means (alike, something in common, unrelated, apart), why scaling a vector leaves the
    cosine alone but not the distance, and that for unit vectors the cosine is the dot product and
    |â − b̂|² = 2 − 2 cos θ. `query cat` ranks the others by cosine and says when the plain dot product would rank a
    longer vector first; `analogy king - man + woman` finds the nearest vector to the sum, leaving the three out. With
    three or more vectors the matrix of cosines (E Eᵀ for unit rows) is drawn beside them, and vectors in a plane are
    drawn as arrows with the angle between the pair and the analogy's steps dashed
  - *SVD & PCA*: a matrix such as `[[3, 2, 2], [2, 3, -2]]` (up to 8 × 8) taken apart as A = UΣVᵀ, the four matrices
    drawn as shaded grids and the singular values as bars with their share of σ₁² + σ₂² + … (the sum of the squared
    entries). The captions give the rank (the number of σ that are not 0), A as a sum of rank-1 pieces σᵢuᵢvᵢᵀ, the
    eigenvalues of a symmetric matrix, and the condition number; for a 2 × 2 matrix the unit circle is drawn beside the
    ellipse A makes of it, v₁ and v₂ going to σ₁u₁ and σ₂u₂. `rank 1` keeps the first pieces, fades the rest, and draws
    A₁ beside what it misses, which is √(the dropped σ²) and no rank-1 matrix beats (Eckart–Young). With `pca`, the
    rows are points (up to 30, with 2 to 8 features, also written `(2.5, 2.4), (0.5, 0.7), …`): they are centred
    (and with `standardize` scaled), and the covariance matrix, the principal components as its eigenvectors (the
    right singular vectors of the centred data), the variance each explains and what keeping k loses are worked out.
    Two features are drawn as points with the components from the mean and each point's projection onto PC1; more
    are drawn by their scores on PC1 and PC2. A feature whose variance is over 100 times another's is pointed out,
    since PC1 then follows its units
  - *Gradient descent lab* (a live piece on the board, from the AI menu or the Shapes panel): a ball on a curve, dragged
    to where it starts, and a learning rate η on a slider (momentum β too, in the last puzzle and in free play). A
    dashed hop shows where the next step, −η · f′(x), would land before it is taken, so moving the slider shows what
    the rate does; Step takes one step and Run plays them until the try is judged. Nine puzzles: reach the bottom of
    (x − 3)² in 10 steps, in one step (η = 1/f″), jumping past it on the way, bouncing for ever (η = 2/f″); a steep
    and then a shallow valley, where the right rate is far smaller or far larger; a ball on a hilltop, where the slope
    is 0 and it cannot move until dragged off; the deeper of two valleys; and momentum to coast over the hump between
    them. A failed try says why (crept too slowly, flew off, still bouncing, settled in the other valley, no slope),
    stars go to a puzzle done at the first try, and six discoveries are kept. Free play takes any f(x)
  - *PCA lab* (a live piece on the board, from the AI menu or the Shapes panel): a cloud of points and a line through
    it, turned by dragging an end or with a slider. Each point's distance from the line is drawn with the square on
    it, the error being the mean of those squares, and the points' shadows on the line are marked; bars beside show
    the kept spread (the shadows') and the lost spread (the error) end to end against the whole spread, which they
    make up exactly when the line goes through the mean. Eight puzzles, each with a Check: the line with the least
    error (PC1), the line with the widest shadows (the same line, by Pythagoras), the line with the most error (PC2,
    at right angles), the best line when it can also be moved (through the mean), the best line for distances
    measured straight up (least squares, flatter than PC1), a point dragged until PC1 stands upright (an outlier's
    pull), the place of a point's shadow along PC1 (its score), and points dragged until PC1 keeps 95 % of the spread
    (one number per point is enough). A wrong check says by how much or why, stars go to a puzzle done at the first
    try, and eight discoveries are kept. Free play takes any points (click to add, drag, tap to take away), with PC1
    or the least-squares line shown on request
  - *Softmax lab* (a live piece on the board, from the AI menu or the Shapes panel): a score bar for each class, dragged
    up or down, and the probabilities softmax makes of them beside, with a strip showing they add up to 1; a
    temperature T on a slider, buttons that shift every score at once, and with a target the cross-entropy loss
    −ln p(target) and its gradient p − y as arrows on the scores. Eight puzzles, each with a Check: one class to at
    least 0.8 (raising one score takes from all the others), equal odds (equal scores), a score raised without changing
    any probability (only differences matter), one class twice as likely as another (a difference of ln 2), the scores
    locked and T turned down to sharpen and up to flatten, a loss below 0.1 by following the arrows, and two of five
    classes sharing the top (a soft arg max). A wrong check says why, stars go to a puzzle done at the first try, and
    eight discoveries are kept. Free play takes two to five classes, any temperature and any target
  - *Embeddings lab* (a live piece on the board, from the AI menu or the Shapes panel): words as arrows from the origin
    of a plane, their tips dragged about (snapping to 0.1), with the numbers each puzzle is about beside them as bars:
    a cosine and the angle, a length, the words nearest a query, how far an analogy lands from its word, dot products.
    Eight puzzles, each with a Check: two words alike (a cosine of 0.95), unrelated (about 0, at right angles) and
    opposite (−0.95), an arrow twice as long that is still as alike (cosine ignores length), a query placed so that its
    two nearest words are banana and cherry (embedding search), queen placed where king − man + woman lands (drawn as
    the arrow from man to woman laid again from king), woman placed so that one direction serves two analogies, and a
    query scoring at least 4 with one key and at most 0 with another by the dot product, as attention does. A wrong
    check says why, stars go to a puzzle done at the first try, and eight discoveries are kept. In free play any word
    can be dragged, and tapping words picks them: one shows its nearest words, two how alike they are, three where
    their analogy lands
  - *Backprop lab* (a live piece on the board, from the AI menu or the Shapes panel): a small computational graph, its
    inputs on the left and the loss L on the right, each node with its value from the forward pass and under it a box
    for its gradient ∂L/∂node, typed in by hand going back from L (−4, 0.25 and 1/4 all count). Eight puzzles, each
    with a Check: the boxes of a × gate (the inputs swap) and of a + gate (the gradient passes unchanged), one neuron's
    squared error (the local slopes multiply along the chain), a value used twice (the paths add), a sigmoid (its slope
    σ(1 − σ)), a ReLU that is off (nothing comes back), two layers (the later weight multiplies what reaches the first)
    and log loss on a sigmoid (σ − 1). The box being typed in shows the arrows out of its node with their local slopes;
    a wrong check points at the first box from L that is off and says why (the wrong sign, one path of two, the local
    slope without the gradient above). Stars go to a puzzle done at the first try, and eight discoveries are kept. Free
    play takes any of the seven graphs, inputs changed by halves with every gradient shown, and a nudge of 0.01 to the
    chosen input that changes L by about its gradient times 0.01
  - *Tensors lab* (a live piece on the board, from the AI menu or the Shapes panel): a tensor's entries drawn as slices,
    rows and columns, and under them the one line of memory they are kept in, row-major. Eight puzzles, each with a
    Check: tap T[1, 2] (indices count from 0), T[2, 1]'s place in memory (the rows one after another), T[1, 0, 2] in a
    2 × 3 × 4 (the first index picks the slice), T[1, 2, 3]'s place (strides 12, 4, 1), the entry at place 17 (whole
    slices, then rows, then what is left), the strides of a 4 × 3 × 2 typed in (each the product of the lengths after
    it), where T[1, 0, 2] lands in T.reshape(4, 6) (the same memory, new strides) and where Tᵀ[3, 1] sits (the strides
    swapped, so Tᵀ is not contiguous). A wrong check says why (counting from 1, the indices the wrong way round, a view
    read as if laid out on its own, column-major order, one place off). Stars go to a puzzle done at the first try, and
    eight discoveries are kept. Free play takes any of ten shapes and views (a transpose, reshapes, a permute): a tap on
    an entry or a place lights the other with the sum that links them, and Next entry walks the view in its own order
  - *Overfitting lab* (a live piece on the board, from the AI menu or the Shapes panel): noisy points from a hidden
    curve and a polynomial fitted to them by least squares, with a ridge penalty λ on its coefficients. The training
    points (black) are what the fit sees, each with its distance from the curve; the test points (orange) come from the
    same curve and are what it is judged on. A chart beside plots the errors on a log scale with a dot for each setting
    tried, and bars show the coefficients. Eight puzzles, each with a Check: a degree that goes through all ten
    training points (training error 0, a wild curve), the degree with the least test error (it falls and then climbs:
    overfitting), the simplest degree nearly as good on a straight line's data, the degree with the least bias² +
    variance (curves fitted to 20 fresh samples drawn faintly), enough points to tame degree 9 (more data), a penalty
    that tames it instead (ridge), the degree 5-fold cross-validation picks with the test points hidden (the same one
    they would), and a penalty that keeps every coefficient at most 3 while the training error stays low (small
    weights, smooth curve). A wrong check says why (too stiff or too wiggly, bias or variance, a simpler model as
    good, the penalty too strong), stars go to a puzzle done at the first try, and eight discoveries are kept. Free
    play takes any points (click to add, drag, tap to take away), three hidden curves, the degree, λ, the number of
    points and the noise, with the test points, fresh samples and the hidden curve on request
  - *Batch training lab* (a live piece on the board, from the AI menu or the Shapes panel): a line y = wx + b fitted to
    24 points by gradient descent on the mean squared error, a batch of the points at a time. Dials set the batch size
    (1, 2, 4, 8 or all 24), the learning rate η, its schedule over the epochs (constant, halved every 5, η/(1 + epoch))
    and the step (plain, momentum, Adam); Step, Epoch and Run play it. The path of (w, b) is drawn on the loss's
    contours, the line on the points beside the best one, and the loss above the best after every step on a log chart
    with the goal. Six puzzles, each with one dial: the rate for full-batch descent (0.2; 0.5 blows up), the rate for
    one point a step (noisy but 72 cheap steps beat 3), a schedule that lets single-point steps settle, the batch size
    between too few steps and too noisy ones, momentum and then Adam in the long, narrow valley of points spread from 0
    to 10. A miss says why (too slow, still jittering, blew up), stars go to a puzzle done at the first try, and six
    discoveries are kept. Free play turns every dial on either dataset, with new samples
  - *Threshold lab* (a live piece on the board, from the AI menu or the Shapes panel): examples with a model's score on
    a strip, positives above and negatives below, and a threshold dragged across it; at or above it is called
    positive. The confusion matrix, accuracy, precision, recall and F1 as bars, the ROC curve with its area (the AUC,
    the chance a positive outscores a negative) and the precision–recall curve, each with the threshold's point. Six
    puzzles with a Check: recall at least 0.9 (lower the threshold), precision at least 0.9 (raise it), the best F1, rare
    positives where calling nothing positive is 90 % accurate yet catches nothing, the most recall with a false
    positive rate at most 0.1, and high precision on rare positives read off the precision–recall curve. Free play
    takes either dataset, new samples and how far apart the classes' scores are
  - *Nearest neighbours lab* (a live piece on the board, from the AI menu or the Shapes panel): points of two classes
    on a plane and a new point dragged among them; its k nearest vote, with lines to them inside the neighbourhood
    (a circle, or a diamond for distance along the axes). The regions each point would be called can be shaded, test
    points kept out of the vote are framed red when called wrong, and a side panel shows distances among 100 random
    points in 1 to 1000 dimensions. Six puzzles with a Check: drag the point into the other class, a k that outvotes a
    mislabelled neighbour, the k that does best on the test points (k = 1 overfits), scaling features in different
    units, choosing the distance, and the dimensions where the nearest point is almost as far as the farthest. Free
    play takes two blobs, a disc in a ring or different units, and every control
  - *Decision-tree lab* (a live piece on the board, from the AI menu or the Shapes panel): points of two classes cut
    into boxes by straight cuts, each across one feature (x < t or y < t) inside one box; every box calls its points by
    their majority. Tap a box, pick the feature, slide the cut and see how much the Gini impurity (or entropy) falls
    before splitting; the tree is drawn small beside the plane. Six puzzles with a Check: one cut that makes both sides
    pure, the cut that lowers Gini most on overlapping classes, a corner in 3 boxes, crossed classes in 4 boxes (where
    the first cut barely helps), the depth of a greedily grown tree that does best on test points (deep trees
    overfit), and a forest of trees on resampled points voting better than one tree. Free play adds entropy, the best
    cut, every dataset and the forest
  - *k-means lab* (a live piece on the board, from the AI menu or the Shapes panel): points without labels and k
    centres. Assign every point to its nearest centre, move every centre to its points' mean, step by step or run to
    the end, with the error (the sum of squared distances to the centres) after every step and the lowest error for
    each k from 1 to 8 beside it. Five puzzles with a Check: step until nothing changes, drag the centres to within
    10 % of the lowest error, climb out of a bad start stuck in a local minimum (k-means++ or random starts), find the
    elbow at four blobs, and the smallest k that gives a disc inside a ring a cluster of its own. Free play adds no-group
    points, new samples and every control
- **E[X] Random variables** — probability as a model, every step written out and kept exact as fractions where the
  numbers allow
  - *Discrete*: values and their probabilities (checked to add up to 1); E[X] term by term, E[X²], Var(X) = E[X²] −
    E[X]² and σ; the bars with the mean as their balance point and a band of ±σ, and the cdf as steps
  - *Continuous*: a density f(x) on an interval (∞ allowed), checked to have area 1; E[X], E[X²], Var(X) and σ by
    integrals, and the median where F reaches ½; the density shaded beside its cdf, and a note when a long tail pulls
    the mean away from the median
  - *aX + b*: every value moved, E[Y] from Y's own table and again by aE[X] + b, Var(Y) = a²Var(X) and σ scaled by
    |a|; X's and Y's bars on one scale
  - *Joint table*: P(X = x, Y = y) with its margins, the conditional row given X = x₀, independence checked cell by
    cell (the first cell that fails is shown), E[XY], covariance, correlation, E[X + Y] and Var(X + Y) with 2 Cov;
    the table tinted by probability beside Y given x₀ against Y on its own
  - *Covariance matrix*: points' means, spreads and Σ, the correlation, Σ's eigenvalues and PC1's share; the points
    with the 1σ and 2σ ellipses, whose long axis is the PCA lab's PC1
- **L(θ) Likelihood** — maximum likelihood, the step from probability to learning: the parameters that make the data
  most likely, each found by taking the log (a product becomes a sum) and setting the slope to 0
  - *A coin's p*: flips as 1s and 0s; L(p) = pᵏ(1 − p)ⁿ⁻ᵏ, ℓ(p), ℓ′(p) = 0 and p̂ = k/n, drawn as L(p) (in units of
    a power of ten when it is tiny, as it soon is) beside ℓ(p), both peaking at p̂; an all-1s run peaks at the end
  - *Normal μ, σ*: a sample; ℓ(μ, σ), the two slopes, μ̂ the mean and σ̂² dividing by n, set beside s² dividing by
    n − 1; ℓ(μ) as a parabola and the fitted bell over the sample
  - *Poisson λ*: counts; ℓ(λ) and λ̂ the mean count, with how often each count came up against what Poisson(λ̂) expects
  - *Least squares*: points; a line plus normal noise, whose log-likelihood depends on a and b only through the sum of
    squared errors, so the most likely line is the least-squares one and σ̂² the mean squared error; the line with its
    residuals beside the mean squared error as the slope changes
  - *Log loss*: 0/1 labels and a model's chances; L as a product of each label's chance, −ℓ, and the log loss −ℓ / n;
    each label's cost −ln P(y | q) beside the curves −ln q and −ln(1 − q), where a confident mistake costs most
- **H(p) Information** — surprise, entropy, cross-entropy and KL divergence, in bits
- **ŷ Regression** — several features by the normal equations (and gradient descent to the same weights), polynomial and one-hot features, logistic regression, and reading the weights
  - *Entropy*: chances (and names) of outcomes; each surprise −log₂ p, H(p) as their average and log₂ n as its most;
    the chances beside the surprises with H marked
  - *A coin*: H(p) = −p log₂ p − (1 − p) log₂(1 − p) at the chosen p, on the curve from 0 to 1 with its peak of 1 bit
  - *Cross-entropy*: p and the q a code was built for; code lengths −log₂ q, H(p, q), H(p) and the bits wasted,
    D_KL = H(p, q) − H(p); p beside q, and each outcome's best code length beside the one used
  - *KL divergence*: both ways round, term by term (a term can be negative, the sum never is), to show it is not a
    distance
  - *Log loss*: a model's chances and the true class; the one-hot target leaves −ln q of the true class, the softmax
    lab's loss, in nats and in bits
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
- **H₀ Inference** — confidence intervals and hypothesis tests, worked step by step with the distribution drawn
  - *Confidence interval*: for a mean (t when σ is unknown, z when it is known; from x̄, s, n or from the data)
    or a proportion — standard error, critical value, margin of error and the interval, with the middle C % shaded
  - *What 95 % means*: 40 intervals from simulated samples, the ones that miss μ in red, and the share over 2000 more
  - *Hypothesis test*: one-sample z, t or proportion test against ≠, < or > — H₀ and H₁, the statistic, the
    p-value shaded on the null distribution next to the rejection region, and the decision both ways (|t| > t*, p < α)
  - *Two samples*: Welch's t for two means, the paired t on the differences, two proportions with the pooled
    estimate — plus the interval for the difference and whether it contains 0
  - *χ² tests*: goodness of fit (equal or given proportions, e.g. Mendel's 9 : 3 : 3 : 1) and independence in a
    two-way table, with the expected counts, each (O − E)²/E and a warning when an expected count is below 5
  - *Errors and power*: the curves under H₀ and H₁ with α, β and the power shaded, and the n needed for 80 % power
  - The normal, t and χ² probabilities are computed (incomplete gamma and beta functions), not read from tables
- **🎯 Practice** — questions made fresh for 93 skills in five areas (number, algebra, geometry & trigonometry,
  calculus, probability & statistics), at three levels
  - Type the answer and press Enter: numbers (an amount of money with or without its $, ₾ or ₽), fractions, mixed
    numbers, surds, sets of roots in any order, ratios (2 : 3, sent back when not in simplest form), points, intervals, matrices row by row (1, 2; 3, 4 or
    [[1, 2], [3, 4]]), eigenvectors (any non-zero multiple), and expressions in x that are checked for equivalence (any form of a derivative, any + C)
  - The form counts when the question asks for one: "lowest terms", "simplify the surd", "not fully factorised",
    "multiply out the brackets", "standard form" and "check your rounding" are said, not marked wrong
  - A wrong answer that a known mistake gives is named, with a way to see it: tops and bottoms of fractions added,
    (a + b)² as a² + b², a negative power taken as a negative number, × and ÷ worked from left to right after + and −,
    digits cut off instead of rounded, an inequality's sign not turned round, the right size with the wrong sign, more
    digits after the point taken for a bigger decimal, more pieces taken for a bigger fraction, a perimeter made for an area, the unshaded part counted, the top number of pieces shaded, the shapes on a balance's other pan left out, ten times
    the input taken for ten times the output, x · x taken for 2x, 360° taken for a straight line, a rectangle's
    diagonals taken for mirror lines, a point's numbers the wrong way round, a chart's lines counted instead of its
    scale read, a flat line taken for moving, along over up for a gradient, the route with the fewest roads taken for the shortest,
    the cheapest roads taken though they make a loop, an even number taken for a multiple of 4, 5 cents written as .5,
    the smaller digit taken from the larger in every column, the last digits of decimals lined up instead of the
    points, a ratio's terms added to instead of multiplied, m : n taken for the fraction m/n, a rate worked the wrong way
    round, one of two parts given for the number they make, a number used twice, a total of the wrong parity, only
    the neighbours out of order counted, and more (78 in all, in
    [src/math/mistakes.ts](src/math/mistakes.ts));
    it still counts as a miss
  - Comparing numbers with <, = and >: towers of blocks to count first, then place value, decimals, negative numbers
    and fractions; the sign is typed or picked from three buttons, and the worked solution lays two pencils across the
    towers to draw it
  - Closer to?: which benchmark a number is nearest, typed or picked from buttons — a whole number between two tens
    or against 0, 50 and 100, then a fraction or a decimal against 0, ½ and 1, then a sum, product or quotient to
    estimate against three round numbers; never a tie or a near one. The lower ten for a number whose next digit is 5
    or more is named as a cut rather than a rounding, and the steps give the distance to each benchmark
  - Divisible by?: which of a few divisors divide a number, listed in any order, typed or tapped from buttons — 2, 5
    and 10, then 3 and 9 as well, then 4, 6 and 8 too; every number divides by at least one. A divisor not offered is
    sent back; an even number taken for a multiple of 4, a multiple of 3 for one of 9, an odd multiple of 3 for one of
    6, and a multiple of 10 given without 2 and 5 are named; the worked solution is the Divisibility tab's table of
    tests for those divisors
  - Kakooma: which of a few numbers is the sum of two others, typed or picked from buttons — four numbers to 10,
    five to 20, then five from the times tables and a product of two others. Exactly one number is made from two
    others, in one way; above easy most sets lay a trap and the answer is seldom the largest. One of the two parts
    given for the number they make, a number twice another (or its square) that would need the other twice, and on
    hard a sum given for a product are named
  - Money, decimals, ratio and rate, from the primary syllabus (Singapore's 2021 Primary Mathematics, P2 to P6),
    answered with a number or a ratio and worked in lines:
    - *Money*: dollars and cents in decimal notation and in cents only, then adding amounts, change from a note and
      what is left after spending (the smaller digit taken from the larger in each column named), then a few things
      bought and the change (paying for one of each named). Amounts are in dollars in English, lari and tetri in
      Georgian, roubles and kopecks in Russian
    - *Decimals*: adding and subtracting with one or two places (the last digits lined up instead of the points
      named), then × and ÷ by 10, 100 or 1000 and by a one-digit number, then measurements from one unit to the other
      (km and m, m and cm, kg and g, ℓ and ml) and a whole number divided by a whole number as a decimal, exact or to 2
      places, with the long division as the worked solution (the digits moved the wrong way named)
    - *Ratio*: simplest form and the missing term of two equal ratios, then sharing a total and one part known, then
      three-term ratios and a part as a fraction of the whole; the Percentages & ratios tool's bar models are the
      worked solutions (a term added to instead of multiplied, and m : n taken for m/n, named)
    - *Rate*: rice by the kilogram and a tap by the minute — the rate, the total or the number of units from the
      other two, then two steps through the rate for one (dividing the wrong way round, and adding the difference in
      units instead of scaling, named)
  - Make the target: number cards and a target, answered with a sum of the cards, typed or tapped from buttons — three
    cards with + and −, then four with + − ×, then all four with + − × ÷ (like the 24 game). The sum is worked out
    exactly in fractions with × and ÷ first, and the preview shows what it makes as it is typed; a number not on the
    cards, a card twice, a sign the level doesn't allow or a card left out is sent back, and a sum that hits the
    target only when worked from left to right is named as that slip
  - Quick look: dots shown for a moment when Look is pressed, then hidden, and the number typed — a die or scattered
    dots up to 6, then ten frames, two dice or two groups up to 12, then two ten frames or three groups up to 20 (one
    more look after a wrong answer); the worked solution colours the groups and adds them (10 − 2 = 8, 4 + 3 + 5 = 12)
  - Number line estimation, answered by putting a pin on a line with only its ends labelled: 0 to 10 or 20, then 0 to
    100 or 1000, then fractions and decimals on 0 to 1 or negative numbers. Within 5 % of the line's length is right,
    within 10 % close, and a miss says which way the number is; the worked solution shows the number's place, how
    far along the line it is and which side of half way
  - Area on a grid, answered by making the shape: tap dots on a grid to put its corners (drag one to move it, tap it
    to take it off) — a rectangle with an area, then a triangle with an area (half squares come in), then a shape on
    the grid lines with an area and a perimeter. The shape is stored as its corners (`poly:1,1;5,1;5,4;1,4`) and
    marked in whole numbers, so the server marks it again like a typed answer; a shape whose sides cross, or the right
    area in the wrong shape, is sent back without counting, and a rectangle whose perimeter is the area asked for, or
    a triangle whose base × height is, is named as the mistake it is
  - Estimating angles: an angle drawn, and the nearest of a few sizes picked (30°, 90° or 150°; then four in 30s,
    turned any way; then reflex angles against sizes in 45s). The size a protractor's other scale gives (180° − the
    angle) and the angle on the inside (360° − the angle) are among the options, and named when picked
  - Missing angles: a figure drawn to size with all its angles but one marked — on a straight line or in a right
    angle, then around a point or in a triangle, then an isosceles triangle's base angle from its top one, or a
    quadrilateral's last angle. The wrong total (360° for a line, 180° for a whole turn) and an isosceles triangle's
    two base angles not shared out are named; the worked solution draws the figure with the angle filled in
  - Lines of symmetry: how many a shape has — rectangles, squares, triangles and a kite standing straight, then a
    rhombus, parallelogram, trapezium and regular pentagons and hexagons turned, then an octagon, a star and shapes of
    squares. Counting the diagonals of a rectangle, parallelogram, kite or trapezium as well is named; the worked
    solution draws the lines
  - Nets of a cube: which of four shapes of six squares folds into a cube (a net with four in a row against shapes
    with a 2 × 2 block and a look-alike, then a net without four in a row against look-alikes), or which face of a net
    is opposite ★, typed or picked as a letter. A look-alike picked, or a face next to ★ in the net, is named; the
    worked solution colours the net's opposite faces alike
  - Coordinates: a point drawn on a grid and its coordinates typed — in the first quadrant, then in all four, then the
    fourth corner of a rectangle whose other three are drawn. The numbers the wrong way round, (y, x), are named; the
    worked solution draws dashed lines from the axes to the point
  - Gradient of a line: a line drawn through P and Q on a grid, a few steps apart, and its gradient typed — 1 to 3,
    then −3 to 3, then a fraction in lowest terms. Along over up is named (a line going the wrong way is the sign
    slip); the worked solution draws the step from P to Q as a triangle
  - Reading bar charts: a chart of fruit against a scale in ones, then twos or fives, then tens or twenties, with bars
    ending half-way between lines — how many, how many more, or how many altogether. The lines counted instead of the
    scale read, and the bigger number given for "how many more", are named; the worked solution marks the bars
  - Graph stories: a walk from home told in parts (walks away slowly, runs away, stops, walks or runs back) and four
    graphs of the distance from home against the time to pick from, by letter — walking only, then walking and running,
    then four parts. A graph with a stop and a walk mixed up, or with walking and running the wrong way round, is
    named; the worked solution numbers the parts on the right graph
  - One stroke (Euler): how many vertices of a graph have an odd degree, on six vertices then nine, then which of four
    graphs can be drawn in one stroke, picked by letter. The even vertices counted, and a graph with more than two odd
    vertices picked, are named; the worked solution fills in the odd vertices, or numbers the stroke edge by edge
  - Colouring graphs: the fewest colours for the vertices so no edge joins two alike — a grid's graph (two), then
    graphs with triangles (three), then three or four. The edges at the busiest vertex plus one, and two colours for a
    graph with an odd loop, are named; the worked solution colours the graph
  - Shortest route: places joined by roads of different lengths and the length of the shortest route between two of
    them, on six, nine (where a detour always pays) and twelve places. The route with the fewest roads, and the one that
    takes the shortest road from each place in turn, are named; the worked solution draws the route and adds it up
  - Connecting towns: the least total cost of roads joining every town (a minimum spanning tree), on six, nine and
    twelve towns, every cost different. The n − 1 cheapest roads taken though they make a loop is named; the worked
    solution draws the cheapest network and adds it up
  - Plus or minus (parity): which of four totals can ±1 ±2 … ±n make, for n up to 5, 9 and 14 (negative totals on
    hard)? A total of the wrong parity, and one of the right parity but beyond 1 + … + n, are named; the working
    shows the sum, the even difference and the signs that do it
  - Swaps to sort (a monovariant): how many swaps of neighbours that are out of order put 4, 5 or 7 numbers in order?
    Exactly the pairs out of order. Counting only the neighbours out of order at the start, or the numbers out of
    place, is named; the working counts, for each number, the smaller ones after it
  - Probability and statistics, past school (H2 Mathematics, grades 11–12): the expected value and variance of a small
    distribution and Var(aX + b); conditional probability from a table of counts, the total probability of a positive
    test and Bayes' rule for P(D | +); binomial probabilities, P(X = k) and P(X ≤ k), and normal ones; the covariance
    and the correlation coefficient of a few pairs, and the covariance from a joint table (university); and a
    hypothesis test, the decision from a p-value (picked: reject H₀ or not), the z statistic and the p-value. Worked by
    the Random variables, Statistics (tree, distributions) and Inference tools
  - Linear algebra, past school (university, except where noted): projections (the scalar and vector projection of
    a on b, and the foot of the perpendicular from a point to a line in 3D, as in H2 Mathematics), matrix products (2 × 2
    by 2 × 2, as in O-Level; AᵀB; a and b with A² = aA + bI), determinants (2 × 2, 3 × 3) and the inverse of a 2 × 2,
    systems and rank (three equations in three unknowns, the rank of a 3 × 4 matrix, the k at which a system stops
    having exactly one solution) and eigenvalues (of a 2 × 2, an eigenvector for a given eigenvalue, and the other two
    eigenvalues of a 3 × 3 from its trace and determinant). Matrices are built so every answer is a whole number or a
    small fraction; the worked solution is the Matrices tool's (elimination, cofactors, the eigenspaces) or the Vectors
    tool's
  - Machine learning (university): gradient descent (one step and two steps on a quadratic, and what a learning
    rate does on ax², picked: close in steadily, zig-zag in or zig-zag away), backpropagation (one node of a graph,
    the squared error (wx + b − y)², and a ReLU that can be off), softmax (a class's probability, the cross-entropy
    loss and its gradient p − y), overfitting (which of three models over- or underfits, the polynomial degree to
    choose, when early stopping stops), precision and recall (from a confusion matrix, F1, and at a threshold) and
    clustering (a k-nearest-neighbours vote and a k-means step and its sum of squares, on a drawn grid). Stepping up
    the slope, the missing 2 of u², a gradient through an off ReLU, p for p − 1, the degree with the lowest training
    error, the best epoch for the stopping one and precision for recall are named
  - A sound for a right answer and a miss (🔊 turns them off, remembered in the browser) and a burst of confetti at
    3, 5, 10, 15 and 20 right in a row, still for anyone who has asked for less motion
  - Shade the fraction, answered by tapping the pieces of a bar, a grid, a circle or a set of counters: as many
    pieces as the bottom, then two to four times as many (¾ of 12 is 9), then counters too, up to 30. Any pieces will
    do; shading the top number of pieces (3 for ¾ of 12) is named
  - Fractions in order: four or five fractions written smallest first, typed (commas or <, mixed numbers and decimals
    read too) or tapped in turn — unit fractions or the same bottom, then any bottoms, then five on 0 to 2 with some
    past 1 and some nearly 1. Biggest first is sent back; unit fractions put in the order of their bottoms is named
  - Equal fractions: which of four is equal — the fraction of a bar that is shaded, a fraction with bigger numbers, or
    a fraction's decimal or percentage — typed or picked. The wrong options are the slips people make, each named when
    picked: the unshaded part, shaded against unshaded, the same number added to top and bottom, the fraction's digits
    read as a decimal (3/4 as 0.34)
  - Make a whole: a bar with unit-fraction tiles in it (½ + ⅓ + ? = 1), the missing fraction typed in lowest terms —
    halves, quarters and eighths, then thirds, sixths and twelfths or fifths and tenths, then targets of ¾, ⅚ or 1½.
    Tops and bottoms added (½ + ⅓ as 2/5) is named; the worked solution fills the gap with the fewest tiles
  - Comparing fractions: the same bottom or one piece each with the bars drawn, then the same top, either side of a
    half and one piece short of a whole, then a common bottom; the worked solution shows the bars, the pencils across
    their shaded parts and, over a common bottom, the bars cut into the same pieces
  - Balance puzzles: scales that balance with squares and weights on them, drawn, and what one square weighs typed —
    one shape on one pan (■ ■ ■ + 2 = 14), then the same shape on both (■ ■ ■ + 2 = ■ + 10), then two shapes on two
    scales. Leaving the squares on the other pan out (■ ■ ■ + 2 = 10 for the second) is named, and the worked solution
    takes the same off both pans a line at a time
  - Find the rule: four pairs a machine makes (1 ↦ 5, 2 ↦ 8, 3 ↦ 11, 5 ↦ 17) and what it makes of a bigger number, or
    at hard what went in to make one — n + 7 or 4n, then 3n + 2 for up to 100, then backwards. Ten times as much in
    taken for ten times as much out (10 ↦ 2 × 17) and the steps undone in the wrong order are named
  - Growing patterns: figures 1, 2 and 3 of a pattern of squares (an L, a T, a plus, a frame, a square), and how many
    squares figure 5, 10 to 20 or 12 has (n² and n(n + 1) at hard), or which figure has so many. Figure 10 taken for
    ten figure 1s is named; the worked solution colours the part that stays and the part that grows
  - Equal expressions: which of four is equal to x + 1 + x, 3(x − 2) or x · 2x for every x, typed or picked. The
    wrong options are the slips people make, each named when picked: unlike terms joined (3x for 2x + 1), only the
    first term in the bracket multiplied, x · x taken for 2x
  - Negative numbers (with temperatures), order of operations, rounding, significant figures, standard form, estimation
    and bounds, and inequalities (typed as x >= 4, 4 ≤ x, −1 < x ≤ 3 or [4, ∞)) are among the skills
  - A live preview shows how the answer was read; two misses show the answer, and the worked solution comes from
    the tool that covers the topic (Algebra, Powers & logs, Derivatives, Coordinate geometry, Inference, …)
  - Progress per skill is kept in the browser, and a missed question comes back three questions later
  - *Your grade*: every level of every skill belongs to a grade, 1 to 12 or university, by the grade in which
    Singapore's syllabuses teach it (primary, Secondary 1–4 with Additional Mathematics, H2 Mathematics; they teach
    grades 9–10 and 11–12 as blocks, so those are one rung each). *Find my grade* asks questions from the middle of
    the grades still possible: two right at the first try rule out the grades below, one wrong those from it up, so at
    most 8 questions place a learner. The page then shows the ladder with their grade marked and practises that grade's
    levels until 80 % of them are secure (3 right in a row at the first try), when the next grade begins; the front page
    says which grade they are working on
  - *Course map* (`#/course`): the way from counting to machine learning in eight stages (number; algebra and
    geometry; calculus; linear algebra; probability and statistics; optimisation; classical machine learning; deep
    learning), each with its skills, every level marked secure, behind the learner's grade or still to do, and a bar
    that fills as they are secured. *Next for you* is the lowest-grade level whose prerequisites are met, one click from
    practice; each stage also has a board tool to explore and a live lab to try, opened on that stage's own board
  - Screen readers hear each question: its words, and its maths as MathML (the picture is hidden from them)
  - *Class study*: a student joins a class with its code and gets a student code of their own (no name or email);
    each question they work on is then saved on the server for research — see [Class study](#class-study) and [docs/study.md](docs/study.md)
  - *Worksheet*: 4–20 questions on one skill or mixed, with an answer key, put on the board in one click (and
    re-opened to change them)
- **Vector spaces** (in *[ ] Matrices*) — exact fractions, pictures for ℝ² and ℝ³
  - *Span & independence*: row reduction to the pivots, rank = dim span, a basis from the pivot columns,
    the dependency relation (2v₁ + 3v₂ − v₃ = 0), and the span drawn as a line or plane
  - *Four fundamental subspaces*: C(A), R(A), N(A), N(Aᵀ) with bases and dimensions, and rank–nullity
  - *Coordinates*: [w]_B by solving B·c = w, drawn on the skewed grid of the basis
  - *Gram–Schmidt*: projections subtracted step by step, orthonormal vectors with simplified radicals (√10/4)
  - *Eigenvalues*: det(λI − A) exactly (Faddeev–LeVerrier), rational roots with multiplicity, eigenspaces as
    null spaces of A − λI, A = PDP⁻¹ when diagonalisable, non-diagonalisable and complex cases, and a
    picture of v and A·v on the eigenvector lines
- **♟ Problem-solving tactics** (after Zeitz, *The Art and Craft of Problem Solving*)
  - *Symmetry*: 1 + 2 + … + n as a staircase and its turned copy filling an n × (n + 1) rectangle, with Gauss's pairing
  - *Extreme principle*: everyone squirts their nearest neighbour with a water pistol — the closest pair is forced to
    squirt each other, so an odd crowd always leaves someone dry; arrows to each nearest person, the dry ones in green
  - *Pigeonhole*: p pigeons in h holes, or numbers sorted into boxes by remainder — two in one box differ by a multiple of n
  - *Parity*: can ±1 ±2 … ±n make t? Turning a + into a − changes the total by an even number, so the parity of
    1 + … + n decides; when it can be done, the signs that do it
  - *Mod 3 invariant*: red, green and blue chameleons, two of different colours meet and both take the third colour —
    the remainders mod 3 shift together, so all one colour is possible exactly when two of them agree; the fewest
    meetings drawn when it is
  - *Colouring*: can dominoes tile a board with squares removed? The chessboard colouring rules it out when the
    colours do not balance; otherwise a search draws a tiling or shows that none exists
  - *Monovariant*: swap neighbours that are out of order until the list is sorted — each swap removes exactly one
    inversion, so it stops after exactly that many swaps, whichever pair you pick
- **♞ Problem-solving strategies** — how to start, before you know which tactic a problem needs
  - *Pólya's four phases* (*How to Solve It*): understand, devise a plan, carry it out, look back — a card for your
    own problem with your notes in each phase, and Pólya's own questions in any phase you leave empty
  - *Start-up strategies* (Zeitz): get your hands dirty, make it easier, the penultimate step and wishful thinking,
    each worked on a sample problem for the n you type — the sum of the first n odd numbers (L-shapes round a
    square), handshakes (every pair joined round a circle), the locker problem (the open lockers are the squares) and
    a take-1-to-3 stones game (the lost piles are the multiples of 4)
- **⇅ Algorithms** — algorithms and data structures, traced step by step with every count shown
  - A step slider on every trace: rows, table rows, graph and tree states, calls and board positions appear one
    step at a time (the newest one highlighted), and the answer is only stated on the last step
  - *Sorting*: bubble, insertion, selection, Shell, merge, quicksort (Lomuto), heap and counting sort — one row
    per pass, split, merge or partition, with arrows showing where every value moved, the partition being worked
    on bracketed, comparisons and swaps counted, and the complexity explained; as cells or as bars
  - *Searching*: binary search with lo / mid / hi on every step (sorting the input first if needed) and linear search
  - *Patterns*: two pointers (a pair with a given sum, the two lines that hold the most water, the rain trapped
    between bars, removing duplicates in place with a slow and a fast pointer, the Dutch national flag's three-way
    partition), Floyd's fast and slow pointers (meeting in the loop, then at its entrance — the repeated number),
    sliding windows (k neighbours, the longest run without a repeated character, the shortest run whose sum
    reaches S), prefix sums with a map (subarrays that add up to k, negatives allowed), a monotonic stack (the next
    greater value, also wrapping round to the start) and Kadane's maximum subarray — pointer names under the cells,
    one row per move
  - *Graphs*: type edges like `A-B 4, B-C 2`; BFS (levels, queue), DFS (recursion stack), Dijkstra (distance
    table, shortest-path tree), Bellman–Ford (negative edges, early stop, the negative cycle named), Floyd–Warshall
    (all-pairs table, each improvement marked with the vertex it went through), Prim and Kruskal (minimum spanning
    tree, cycle checks), union–find (sets after every edge) and Kahn's topological sort (layered drawing, cycle
    detection); directed or undirected
  - *Trees & heaps*: binary search trees with all four traversals (a repeated key goes right), AVL trees with balance factors and
    LL/RR/LR/RL rotations, and min/max-heaps built by heapify — the tree and the array side by side
  - *Stacks, queues, hashing*: push/pop/peek traces, and hash tables with chaining or linear probing
    (probe sequences, collisions, load factor)
  - *Dynamic programming*: LCS, edit distance, 0/1 knapsack and coin change as filled tables with the
    traceback path — and greedy coin change shown failing where it does; the number of ways to make change (a row
    per coin) and the ways to climb a staircase 1 to k steps at a time
  - *Recursion*: call trees for Fibonacci (repeated calls marked — or cut short with memoisation), factorial and
    the towers of Hanoi (every move numbered); N-queens by backtracking (the first steps, dead ends, the board and
    the number of solutions); subset sum as a take / skip tree with branches over the target cut
  - *Strings*: naive matching (every shift), KMP (prefix table, shifts that skip what is known to match) and
    Rabin–Karp (rolling hash, spurious hits) — character comparisons counted against the naive algorithm
  - *Complexity*: the master theorem with the recursion tree and the work on each level, and growth rates
    from log n to n! with running times at 10⁸ operations per second
- **∑ Formulas** — type LaTeX with a symbol palette and live preview; rendered with MathJax
- **📈 Graphs** — plot up to 6 functions `y = f(x)` with ranges, grid, auto-scaling and asymptote handling
- The tools sit in four menus on the top bar: **Arithmetic** (models, with place value among them, and mental math), **Geometry** (geometry,
  school geometry, coordinate geometry, vectors, trigonometry, trig identities, 3D), **Algebra** (formulas, graphs, functions, equations, polynomials, powers & logs, sequences &
  series,
  matrices, complex numbers, analysis, derivatives, integrals, applied calculus, ODEs, numerical methods) and
  **Discrete** (number theory, combinatorics, graph theory, logic, tactics, strategies, algorithms, statistics, inference), plus
  **Practice** by area and **Games**, apart from the tools, by the sense each builds: number sense (estimation, quick
  look, make the target, closer to?, divisible by?, prime slice, Kakooma), fraction sense (make a whole, equal amounts, fractions on the line, shade the
  fraction), algebra sense (balance the scales, guess my rule, growing patterns, equal expressions), shape sense
  (the geoboard, guess the angle, missing angles, lines of symmetry, cube nets) and graphs & charts (plot the point, make
  the bar chart, graph stories, draw the gradient) and graph sense (one stroke, colour the graph, shortest route,
  connect the towns) and algorithm sense (be the sort, be the search, be the DP, be the binary search, be the two pointers, be the sliding window, be the backtracking, be the topological sort, name the pattern) and data structure sense (be the heap, be the tree, be the monotonic stack, be the union-find) and system design sense (be the cache, be the load balancer, be the hash ring, be the rate limiter, be the replicas, be the message queue, name the component). In the Shapes tab the games are a group of their own, before the live
  pieces
- **🔍 Find a tool**: Ctrl+K (when nothing is selected) or `/` searches every tool, every tab and names inside them
  ("Dijkstra", "Дейкстра", "quadratic") in the current language, and opens the tool on that tab
- **🎛 Live pieces**: the first group of the Shapes tab, and on the board they answer clicks — click the middle of
  one to use it, drag its edge to move it, and every change is saved with the board and can be undone. The games
  among them are all laid out alike: along the top, the row of puzzles with their stars (each opens once the
  one before it has a star) and ∞ Endless (✏️ Free play on the geoboard); under it, the round's dots, or in the
  endless run its levels (easy, medium, hard) and the streak; along the bottom, the game's own buttons, then Check or
  Next → (Next round after a round), the sound switch and the discoveries so far. They answer alike too: a miss shakes
  the picture with a red flash and says why, a right step glows, a puzzle done cheers in proportion to its stars (one
  star is a pop with a nudge to try again, three a big burst), a streak of 5, 10, 25 or 50 gets a burst of its own, and
  the ninth star brings up a panel with every discovery made and the way on (the endless run, free play, or again from
  the first puzzle):
  - *Clock with hands*: drag either hand (they're geared, like a real clock), digital time on or off, snap to five
    minutes, 🎲 for a random time to read
  - *Dice to roll* (one to three, with the totals so far), a *spinner to spin* (2–10 sections, counts per section) and
    a *coin to toss* (heads and tails counted)
  - *Fractions to shade* (a circle or a bar in 1–12 parts, the fraction written under it), a *ten frame* (or two)
    with red and yellow counters that reads 3 + 1 = 4, and a *hundred square* to colour by hand or show the multiples
    of 2–12; with Jumps on, a tap picks a start and +1, +10, −1 and −10 (or a tap on the square next door) jump from
    it, each jump an arrow beside the numbers (green up, red down) over a trail of the squares visited, the sum written
    under it jump by jump and as one (100 − 10 − 10 − 10 − 1 − … = 64, 100 − 36 = 64), and Replay draws the walk again
    a jump at a time
  - *Dot multiplication*: two rows of k squares for numbers from k to 2k; tap a square to fill the dots through it,
    and the four steps — add the dots, count each as 2k, multiply the empty squares, add — work out the product
  - *Graph with sliders*: type functions on the board; every letter in them (a, b, c, k…) gets a slider with its own
    range and a ▶ to play it; a point to slide along the curve with its coordinates and tangent gradient; scroll to
    zoom, drag to move
  - *Chance experiment*: a coin, a die (4 to 20 sides), two dice, a spinner or a bag of coloured counters, run ×1, ×10,
    ×100 or ×1000 at a click (up to a million); the results as counts or relative frequencies against theory, and
    "over time" one outcome's relative frequency settling on p on a log scale
  - *Comparing with blocks*: two towers of 0 to 10 blocks over number cards; pick <, = or > (green when right), and
    "Join with pencils" slides the towers to a middle line and joins their tops and bottoms, which draws the sign
  - *Comparing fractions*: the same for two fractions, as bars of equal height cut into 1 to 12 parts with the shaded
    parts as the towers; "Same-size pieces" cuts both bars into the lowest common parts (2/3 and 3/4 as 8 and 9
    twelfths)
  - *Shade the fraction*: a shape cut into equal pieces, or a set of counters, and a fraction of it to shade; tap
    pieces, then check. Right first time earns three stars, and the endless run keeps a streak of shapes shaded right
    first time. Four discoveries (pieces not side by side, twenty or more pieces, a fraction of a set, ten in a row)
  - *Balance the scales*: one or two scales that balance with shapes and weights on their pans; set what each shape
    weighs with − and +, then weigh: the scales tip as those weights would make them, with each pan's total beneath.
    Balanced at the first weighing earns three stars, and the endless run keeps a streak of puzzles balanced at the
    first weighing. Four discoveries (a shape on both pans, two shapes at the first weighing, a shape of 10 or more,
    ten in a row)
  - *Guess my rule*: a machine with a hidden rule; put in numbers from 0 to 10 and see what comes out in a table,
    then tap in what it makes of a number too big to put in, or what went in; once answered the machine shows its rule.
    Right first time earns three stars. Four discoveries (0 put in, the rule found from two numbers, backwards right
    first time, ten in a row)
  - *Growing patterns*: figures 1, 2 and 3 of a pattern of squares; build figure 4 by tapping squares on a grid
    (anywhere on it, as long as it is the shape), or tap in how many squares figure 10, 20 or 50 has, or which figure
    has so many. Right first time earns three stars, and the figures then colour the part that stays and the part
    that grows. Four discoveries (figure 50, a pattern that isn't a step each time, which figure, ten in a row)
  - *Equal expressions*: cards to pair up, each with the simplest way to write it — x + 4 + x with 2x + 4, 3(x + 2)
    with 3x + 6, x · x with x² — with a near miss on the board too (2x + 3 beside 2(x + 3), x + x beside x · x). A board
    cleared with no misses earns three stars. Four discoveries (a clean board, the near miss left alone, products and
    powers with no misses, twenty pairs in a row)
  - *Fractions on the line*: four or five fraction cards to put on a line from 0 to 1 (or 2): tap a card, then the
    line. Check shows where each really is, joined to where it was put; in order earns two stars, in order with every
    card within 5 % of its place three, and the endless run keeps a streak of lines put in order. Four discoveries
    (every card within 3 %, nearly 1 just below 1, more than 1 just past it, ten in a row)
  - *Equal amounts*: cards to pair up — a fraction and its picture, a fraction and an equal one with bigger numbers —
    or to put in threes: a fraction, its decimal and its percentage. Tap the cards that go together; a board cleared
    with no misses earns three stars, and the endless run deals board after board with a streak of groups made without
    a miss. Four discoveries (a clean board, one under 20 seconds, a board of threes with no misses, twenty in a row)
  - *Make a whole*: a bar with fraction tiles already in it and a gap to the target; tap tiles of the puzzle's family
    to fill it (tap one in the bar to take it out), too much showing red past the end. An exact fill earns two stars,
    the fewest tiles there can be three; the endless run keeps a streak of puzzles filled with the fewest tiles first
    time. Four discoveries (one tile that fits, three sizes in one fill, six or more of one size, ten in a row)
  - *Closer to?*: a number or a calculation and two or three benchmarks; tap the nearest, and a little line shows
    where the number really is between them. Nine rounds of eight earn stars for how many were right; in the endless
    run a bar runs down for every question, four seconds at first and a tenth less with every right answer in a row,
    and running out counts as a miss. Four discoveries (within a second, a perfect round, an estimate within 2 %, ten
    in a row)
  - *Divisible by?*: a number and a row of divisors; tap every one that divides it and check. One chosen wrongly turns
    red with the number divided by it and what is left over, and right ones with some missing are told there are more.
    Right at the first check earns three stars, at the second two; the hint — the Divisibility tab's test for one
    divisor applied to this number (its last two digits, its digit sum) — costs one. Nine puzzles open in turn (2, 5
    and 10; then 3 and 9; then 4, 6 and 8), and the endless run keeps a streak of numbers right first time without the
    hint. Four discoveries (every divisor, a trap such as even but not by 4 seen through, all found within five
    seconds, ten in a row)
  - *Prime slice*: numbers are thrown up across the stage and fall; swipe across or tap every one that isn't prime
    before it falls, and let the primes fall, for they are bombs. A number cut splits at its smallest prime factor
    (21 = 3 × 7), and a piece that isn't prime yet is thrown up again to be cut in its turn, so 12 goes 2 × 6 and then
    2 × 3. A prime cut and a number not prime let fall are slips: none earns three stars, one two. Nine waves open in
    turn, from 2–20 one at a time and slowly to 2–200 three at once and fast, with more and more numbers that only look
    prime (odd and not a multiple of 5: 49, 51, 91); the endless run keeps a streak of clean waves, and against the
    clock the numbers come a fifth faster. Four discoveries (two in one stroke, a piece cut again, a number only 7 or
    more divides, ten clean waves in a row)
  - *Kakooma*: a few numbers round a circle, one of them the sum of two others (on hard their product); tap it. The
    answer turns green with its two parts ringed; a wrong tap turns red and says why: one of the two parts, a number
    that would need another twice (8 beside 4), a sum among products, or not made from two others at all. No miss
    earns three stars, one two; the hint rings one of the parts and costs one. In a grid, four sets sit in the
    corners and each answer goes into the middle, solved last. Nine puzzles open in turn (two sets and a grid at each
    level), and the endless run keeps a streak of sets done with no miss and no hint. Four discoveries (a trap seen
    through, a whole grid with no miss, a set within four seconds, ten in a row)
  - *Make the target*: tap the cards and signs to build a sum, and what it makes shows as it grows. A sum that makes
    the target earns two stars, a second, different way the third (3 + 4 and 4 + 3 are one way), and the hint — the
    first step of one way — leaves one; the endless run keeps a streak of puzzles made without a hint. Under the
    cards, a way to think about the level stays in view: the target as two parts (a number bond), then a times fact
    near it and the difference made up, then the last step as two numbers each made from its own group of cards. Four
    discoveries (two ways, every card used, made within 15 seconds, ten in a row)
  - *Quick look*: dots flash and hide, and the player taps how many. Nine rounds of five (up to 6; ten frames, dice
    and groups up to 12; two frames or three groups up to 20) earn stars for how many were right, a second look
    capping them at two; the endless run's flash gets an eighth shorter with every right answer in a row. After each
    answer the dots come back coloured by group; four discoveries (a full frame, three groups at a glance, an answer
    within a second, ten in a row)
  - *Number line estimation game*: a number, a line with nothing on it but its ends, and a pin to drag; let go and the
    number's real place shows with how far off the pin was. Nine rounds of five (easy, medium, hard) earn up to three
    stars for how close they come on average (showing the half-way mark caps them at two), and an endless run at any
    level keeps a streak of pins within 5 % and the best streak; four discoveries (a bullseye, the middle of the line,
    a round all within 3 %, ten in a row)
  - *Geoboard*: a dot grid to make shapes on by tapping, with the area and perimeter following the shape and each
    side along the grid labelled with its length. Free play says when a shape shows something: a square, a tilted
    square, the same area as the last shape with a different perimeter, or the other way round (four discoveries,
    kept in the browser). Nine puzzles — rectangles, triangles, then shapes with an area and a perimeter, each the
    practice question of its level — earn up to three stars, a miss or a peek at the numbers costing one, and a
    puzzle opens once the one before has a star
  - *Guess the angle*: an angle drawn, and its size typed in degrees by eye; check, and its real size shows with the
    guess drawn beside it, dashed. Nine rounds of five (an arm along the bottom, turned any way, reflex) earn up to
    three stars for how close they come on average (5° or less three, 10° two), and the endless run keeps a streak of
    guesses within 10°. Four discoveries (spot on, a right angle seen for what it is, a reflex angle within 5°, ten in
    a row)
  - *Missing angles*: a figure drawn to size with its angles marked and one to find, typed in degrees. A wrong answer
    on arms from a point draws the arm it would make, dashed, so it can be seen to be too big or too small. Right
    first time earns three stars. Four discoveries (a whole turn's last angle, one under 30°, an isosceles base angle,
    ten in a row)
  - *Lines of symmetry*: a shape with six or more lines through its middle, the diagonals among them; tap every line
    it folds onto itself along (none is an answer too), then check. A line chosen wrongly turns red with the shape
    folded over it, dashed, so the halves can be seen not to meet. Right at the first check earns three stars. Four
    discoveries (no mirror line at all, the diagonals left alone, six or more lines, ten in a row)
  - *Cube nets*: six shapes of six squares; tap the ones that fold into a cube, then check. A shape that doesn't fold
    shows in red the squares that land on the same face, and once the board is right each net colours its opposite
    faces alike. The last three puzzles fold one net in the mind: tap the face opposite ★, pair by pair. No misses
    earns three stars. Four discoveries (a board with no misses, a net without four in a row, every pair of opposite
    faces first time, ten in a row)
  - *Plot the point*: a coordinate grid and a point to tap — (3, 5) in the first quadrant, then in all four, then the
    fourth corner of a rectangle whose other three are drawn. The point then shows with dashed lines from the axes, and
    a tap on (y, x) is told it has the numbers the wrong way round. Nine rounds of five earn up to three stars (every
    point found three, all but one two). Four discoveries (a point on an axis, both numbers negative, a rectangle's
    fourth corner, ten in a row)
  - *Make the bar chart*: how many of each fruit, and a bar for each to raise to its number against a scale in ones,
    then twos or fives, then tens or twenties — tap the column at a height, or use the arrow keys on a bar. The bars
    still wrong at a check turn orange with a dashed mark where they should reach, and a bar raised to its number of
    lines is told what each line is worth. Right at the first check earns three stars. Four discoveries (a bar of 0, a
    scale in tens or more, a bar between two lines, ten in a row)
  - *Graph stories*: a walk from home told part by part, and its graph of the distance from home against the time
    built from pieces — walking away climbs gently, running steeply, a stop is flat, coming back goes down. The parts
    drawn wrong turn red, with why the first one is. Right at the first check earns three stars. Four discoveries (a
    stop drawn flat, walking and running told apart, a walk back home, ten in a row)
  - *Draw the gradient*: a point A and a gradient (1 to 3, then up or down, then fractions); tap a second point B and
    the line runs across the grid. Checked, the step from A to B shows as a triangle, and a line along over up, the
    wrong way or straight up is told so; any point of the line will do. Right at the first check earns three stars.
    Four discoveries (a negative gradient, a fraction, B further than one step, ten in a row)
  - *One stroke*: a graph to draw without lifting the pen or going over an edge twice — tap a vertex to start, then
    the next along an edge not drawn yet. Getting stuck with edges left is a miss, told when the start was the trouble
    (with two odd vertices the stroke must start at one); on the hard level some graphs can't be done, and the player
    says so. No misses earns three stars. Four discoveries (a stroke back where it began, one from an odd vertex, an
    impossible graph seen at once, ten in a row)
  - *Colour the graph*: pick a colour, tap vertices to give it to them, and check; edges whose ends match turn red.
    Two colours, then three, then the fewest to find (a right colouring with more is told it can be done with fewer).
    Right at the first check earns three stars. Four discoveries (two colours, three for triangles, four, ten in a row)
  - *Shortest route*: tap the places of a route from the green place to the orange one, its roads added up as it
    grows; a longer route is told by how much, and the one with the fewest roads that fewest isn't shortest. Right at
    the first check earns three stars. Four discoveries (a detour that pays, one of two shortest routes, five roads or
    more, ten in a row)
  - *Connect the towns*: tap roads to build them until every town is joined as cheaply as can be; a town left out, a
    loop (its roads turn red) or a dearer network is told so. Right at the first check earns three stars. Four
    discoveries (a cheap road left out for making a loop, a town with one road, twelve towns, ten in a row)
  - *Be the sort*: the player is the algorithm, making each of its decisions in turn: bubble sort's next swap (tap ⇄
    between two neighbours; the compares that swap nothing play themselves from the ▲, and a pass with no swap ends
    the sort), the gap insertion sort's key drops into, the smallest of the rest for selection sort (the first of two
    alike), the run head a merge takes next (a tie from the top run), and the next item smaller than the pivot for a
    partition (it swaps behind the red wall, and the pivot lands by itself). A tap that is not the algorithm's next
    move is not made, and says the rule it broke ("16 and 19 are in order already: bubble sort leaves them"). No miss
    earns three stars, one two. Nine puzzles open in turn, from bubble sort on five items to a merge of two runs of
    four; the endless run mixes them, from the three simple sorts on five or six items to all five on eight or nine.
    Six discoveries (a pass with no swap, a key that stays, the smallest already in place, a run emptied first, the
    pivot landed, ten in a row)
  - *Be the search*: the player is the computer running a graph search on the memory the code keeps, one operation at
    a time, by drag and drop (or a tap on what to move, then on where it goes). Breadth-first search keeps a queue in
    an array (FIFO): drag queue[head] into v, then each new neighbour of v, in alphabetical order, into queue[tail],
    with head, tail and visited[] beneath. Depth-first search keeps a stack (LIFO): drag stack[top] into v, then v's
    unvisited neighbours onto the stack in reverse alphabetical order, so A comes off first; a place popped a second
    time is skipped (continue). Dijkstra's algorithm keeps dist[], prev[] and done[] by place: drag the smallest
    dist[] not done into v, then each neighbour it brings nearer onto its own dist[]. The code runs beside the arrays
    with the lines just run lit, and a log says what each operation did to memory ("queue[4] = E; tail = 5;
    visited[4] = true"). An operation the code would not make is not made, and says the rule it broke ("A queue is
    first in, first out: dequeue takes the front, queue[1] = B, not queue[2] = C"). No miss earns three stars, one
    two. Nine puzzles open in turn, each search on six places, then nine, then bigger; the endless run goes from BFS
    or DFS on six places to all three on twelve. Four discoveries (FIFO gives layers, a place on the stack twice, a
    dist going down, ten in a row)
  - *Be the DP*: the player is the computer filling a dynamic-programming table, one operation at a time, by drag
    and drop (or a tap on what to move, then on where it goes). Seven problems: climbing stairs, the house robber,
    the largest run sum (Kadane), the fewest coins, paths across a grid, the cheapest path, and the longest common
    subsequence. The table and the input arrays show their indexes, the base cases are in, and i (and j) point at
    the cell being filled. Its formula has a slot for each value it reads: drag the cell each slot names (dp[i−1],
    a[i], dp[i−1][j−1]…) into it, left to right, then the result max or min keeps (skip or take, extend or start
    afresh, coin by coin, from above or from the left) into dp[i]; at the end, drag the cell the code returns into
    return (max(dp) for Kadane). The code runs beside it with the line just run lit, and a log says what each
    operation read or wrote ("dp[4] = max(11, 11 + 9) = 20; i = 5"). An operation the code would not make is not
    made, and says the rule it broke ("With i = 4, dp[i−2] is dp[2], not dp[1]"). No miss earns three stars, one
    two. Nine puzzles open in turn; the endless run goes from the 1-D tables on five or six cells to the 2-D ones.
    Four discoveries (the Fibonacci numbers, greedy coins beaten, an answer not in the last cell, the diagonal plus
    one) and ten in a row
  - *Be the binary search*: the player is the computer searching a sorted array, by dragging the pointers the code
    keeps (or a tap on a pointer, then on where it goes). Each round mid goes to (lo + hi) // 2 (rounded down), the
    code compares a[mid] with x, and the player moves lo past mid or hi below it; at the end, mid (found) or −1 (not
    there) goes into return. The lower bound (the first a[i] ≥ x) and the upper bound (the first a[i] > x) run on
    arrays with repeats, with hi = n and hi = mid, and return lo, which may be n, one past the end. The array shows
    its indexes and greys what is ruled out, the code runs beside it with the lines just run lit, and a log says
    what each operation did ("mid = (0 + 7) // 2 = 3; a[3] = 11 < x = 17"). An operation the code would not make is
    not made, and says the rule it broke ("// rounds down: (0 + 7) // 2 = 3, not 4"; "a[3] = 11 is ruled out too:
    lo = mid + 1 = 4"). No miss earns three stars, one two. Nine puzzles open in turn, from seven numbers to fifteen;
    the endless run goes from find on seven to nine numbers to all three searches on up to fifteen. Four
    discoveries (x not there, the edge of a run of repeats, past the end, four looks for fifteen) and ten in a row
  - *Be the two pointers*: the player is the computer running a two-pointer scan, by dragging the pointers the code
    keeps (or a tap on what to move, then on where it goes). Three patterns. The pair sum: i and j start at the two
    ends of a sorted array; s = a[i] + a[j] too small moves i right, too big moves j left, until s == t (drag i or j
    into return) or they meet (−1). The container with the most water: the bars stand over the array with the water
    between i and j; drag the area (j − i) × min(a[i], a[j]) into best when it is bigger, then move the shorter side
    in (on a tie, j); at the end, best into return. Removing repeats in place: i reads and k writes; drag a new value
    a[i] onto a[k] (k moves on by itself), move i past a repeat, and return k, the kept part green and the leftovers
    grey. The code runs beside it with the lines just run lit, and a log says what each operation did ("s = 1 + 11
    = 12 < 13; i = 1"). An operation the code would not make is not made, and says the rule it broke ("s = 12 < t =
    13: the sum must grow, so i moves right to a bigger number"). No miss earns three stars, one two. Nine puzzles
    open in turn, from six numbers to twelve; the endless run goes from the pair sum and repeats on six to eight to
    all three on up to twelve. Four discoveries (no pair at all, a few moves instead of every pair, a tie moves j,
    in place with leftovers) and ten in a row
  - *Be the sliding window*: the player is the computer sliding a window a[l..r] along an array, by dragging its two
    edges (or a tap on what to move, then on where it goes): r a step right grows it, l a step right shrinks it, the
    window's value goes into best when it is better, and at the end best goes into return. Three patterns on one
    loop: the largest sum of k in a row (shrink once it is wider than k, take s once it is k wide), the longest run
    with a sum at most S (shrink while s > S) and the longest stretch of letters without a repeat (shrink while the
    next letter is in it). The window is framed over the array with the cells it has passed grey, the code runs
    beside it with the lines just run lit, and a log says what each operation did ("r = 3; s = 8 + 1 = 9"; "s = 9 −
    2 = 7; l = 1"). An operation the code would not make is not made, and says the rule it broke ("The window is 4
    wide, more than k = 3: a[l] = 2 leaves first"). No miss earns three stars, one two. Nine puzzles open in turn,
    from seven cells to twelve; the endless run goes from the two sums on seven or eight to all three on up to
    twelve. Three discoveries (a slide is one add and one take-away, several shrinks in a row, under 2n moves) and
    ten in a row
  - *Be the backtracking*: the player is the computer running a recursive search with its call stack in view, by
    dragging (or a tap on what to move, then on where it goes): the next choice from a[] into path's next slot (for
    the queens, the queen onto a square of the row the call is on), which calls one level deeper; path's top into the
    pop bin once a call's loop is done; path into res when it is a whole answer; and at the end res into return. Five
    patterns on one loop: every subset (every path is one), the ways to choose k of n, every order (used[] says which
    letters are taken), the sets of sorted numbers adding up to T (the loop breaks at the first one too big) and the
    four queens (path[r] is the column of row r's queen). a[] and path[] show their indexes, the running call's loop
    variable sits under a[], each frame on the stack shows its own, the code runs beside it with the lines just run
    lit, and a log says what each operation did ("path.append(3) → [2, 3]; s = 5"; "res.append([A, B, C]); 1
    found"). An operation the code would not make is not made, and says the rule it broke ("s + 5 = 10 > T = 8: the
    loop breaks, and the bigger ones after it can't fit either"; "The queen in row 0 attacks column 1 on a
    diagonal"). No miss earns three stars, one two. Nine puzzles open in turn, from the subsets of three letters to
    the four queens; the endless run goes from subsets, two of four and short sums to the queens, two of five and
    sums of six. Four discoveries (pruning, a dead end, 2ⁿ subsets, n! orders) and ten in a row.
  - *Be the heap*: the player is the computer keeping a min-heap in an array, drawn both as heap[] with its indexes and
    as the tree it stands for (the children of i at 2i + 1 and 2i + 2). Every change is a drag (or a tap on what to
    move, then on where it goes): the next value onto the end of heap[], a value onto its parent or child to swap them
    as it sifts, the root into out[] or into return, the last leaf into the hole at the root, s onto the index heapify
    sinks next, a small value into the skip bin. Four patterns: push values in turn (each climbs while its parent is
    bigger), pop the smallest until the heap is empty (out[] comes out sorted: heap sort), heapify an array in place (s
    walks back from the last parent, n // 2 − 1), and the k-th largest with a heap that keeps only the k largest so far.
    The code runs beside it with the lines just run lit, and a log says what each operation did ("swap(3, 1): heap[3]
    = 9, heap[1] = 2"; "heap[0] = heap.pop() = 4"). An operation the code would not make is not made, and says the
    rule it broke ("Swap with the smaller child, 2, not 3: then the new parent is smaller than both"). No miss earns
    three stars, one two. Nine puzzles open in turn; the endless run goes from pushes and pops of five or six to all
    four on up to eleven. Four discoveries (a new smallest climbs to the root, heap sort, linear heapify, a heap that
    never grows past k) and ten in a row.
  - *Be the tree*: the player is the computer working a binary search tree, laid out with each node above its place
    among the sorted values, so nothing moves as values come in. Every operation is a drag (or a tap on what to move,
    then on where it goes). Insert and search walk x down from the root, onto the left child when it is smaller and
    the right when bigger; insert drops it into the empty place where the walk ends, search onto the node that holds it
    or into the empty place where it would be (None). The traversals keep an explicit stack: inorder pushes cur and
    goes left until cur is None, then pops the top into out[] and goes right; preorder pops the top into out[] and
    pushes its right child, then its left. The code runs beside it with the lines just run lit, and a log says what
    each operation did ("4 < 8: cur = cur.left = 3"; "stack.pop() = 1; out = [1]"). An operation the code would not
    make is not made, and says the rule it broke ("Push the right child 12 first, so the left one, 3, comes off the
    stack first"). No miss earns three stars, one two. Nine puzzles open in turn; the endless run goes from inserts
    and searches in small trees to all four on eight or nine nodes. Four discoveries (every insert is a leaf, a missing
    value falls off where it would go, inorder is sorted, preorder rebuilds the tree) and ten in a row.
  - *Be the monotonic stack*: the player is the computer sweeping an array left to right with a stack it keeps in
    order, drawn lying left to right with each cell's index under its value. Every operation is a drag (or a tap on
    what to move, then on where it goes): a[i] onto the stack, the top onto the ans[] cell of the index it holds
    (popped and answered), the top into the pop bin, the top or the −1 chip onto ans[i]. Four patterns: the next
    greater value (a bigger a[i] pops every smaller top and is its answer), the days to wait for a warmer day (the
    same, i − j), the previous smaller value (pop every top not smaller, then the top is the answer) and the smallest
    number after removing k digits (a smaller digit pops bigger ones while k lasts; what k is left trims the end). The
    code runs beside it with the lines just run lit, and a log says what each operation did ("a[1] = 2 < 3: ans[1] =
    3"). An operation the code would not make is not made, and says the rule it broke ("a[top] = 5 ≥ a[i] = 4: it
    can't be a smaller one before i; pop it first"). No miss earns three stars, one two. Nine puzzles open in turn;
    the endless run goes from the next greater and the warmer day on six or seven to all four on up to twelve. Four
    discoveries (several pops in a row, indexes left on the stack, trimming the end, under 2n moves) and ten in a row.
  - *Be the union-find*: the player is the computer keeping sets as a forest in parent[], drawn as nodes on a circle
    with an arrow from each to its parent, beside parent[] and size[] with their indexes and the script of commands.
    Every operation is a drag (or a tap on what to move, then on where it goes): cur onto parent[cur] while a find
    climbs to its root, each node it passed onto the root (path compression), the smaller tree's root onto the
    bigger's to join two sets (union by size, the second root under the first on a tie), a node into skip when both
    finds gave the same root, and into yes or no for a question. Three patterns: a list of unions, unions with "are
    these connected?" questions between them, and Kruskal's cheapest spanning tree (the edges by weight over the graph,
    the tree's edges green, a same-root edge skipped as a cycle, stopping at n − 1 edges). The code runs beside it with
    the lines just run lit, and a log says what each operation did ("parent[1] = 0: x = 0"; "find(3) = 0"). An
    operation the code would not make is not made, and says the rule it broke ("Hang root 1 (size 1) under root 0
    (size 1): the smaller tree goes under, the second on a tie"). No miss earns three stars, one two. Nine puzzles open
    in turn; the endless run goes from unions on five or six to all three on eight. Three discoveries (path
    compression, a skipped cycle, Kruskal stopping early) and ten in a row.
  - *Be the topological sort*: the player is the computer ordering the nodes of a directed graph so every edge
    points forward, the graph drawn as nodes on a circle with an arrow for each edge. Every operation is a drag (or a
    tap on what to move, then on where it goes). Kahn's way keeps indeg[] and a queue: a node into the queue (first a
    scan by index of the nodes with indeg 0), the queue's head into order[], u along each of its edges in turn
    (indeg[v] − 1, the edge walked fading), a node into the queue the moment its indeg reaches 0; on a graph with a
    cycle the queue runs dry with nodes left, and one of them goes into "cycle!". The depth-first way keeps a stack of
    open nodes: the top's first unvisited neighbour onto the stack, and a node with none left into order[], at the
    front. The code runs beside it with the lines just run lit, and a log says what each operation did ("0 → 2:
    indeg[2] = 1"; "1 finished; order = [1, 2]"). An operation the code would not make is not made, and says the rule
    it broke ("indeg[2] = 2: something must come before 2"). No miss earns three stars, one two. Nine puzzles open in
    turn; the endless run goes from Kahn and depth first on five nodes to all three on seven or eight. Three
    discoveries (more than one right order, a cycle, the depth-first order is the finishing order backwards) and ten
    in a row.
  - *Name the pattern*: the twelve algorithm-sense games in one: the player reads a problem ("Count the number of
    ways to climb 9 stairs taking 1 or 2 steps at a time") and drags its card onto the pattern that solves it, one of
    twelve tiles (sort, graph search, DP, binary search, two pointers, sliding window, backtracking, heap, search tree,
    monotonic stack, union-find, topological sort). A wrong tile is not taken and says what that pattern needs ("Binary
    search needs a sorted list … and one thing to find in about log n looks. Is that what this problem asks?"); a right
    one moves on, shows the clue that gave it away ("number of ways to climb"), and adds what the pattern needs to a
    cheat sheet beside the board. Thirty-six problems, three for each pattern, their numbers drawn fresh. No miss earns
    three stars, one two. Nine rounds open in turn, from six of the first six patterns to all twelve, the later ones
    with look-alikes (two problems with a sorted list, or graphs that want a route, a group and an order); the endless
    run goes from four problems to eight with look-alikes. Two discoveries (a sorted list isn't always binary search;
    graphs want different machines) and ten in a row. The problem named last can be played by hand: a button ("▶ Play
    it: Two pointers") opens its pattern's game beside it on the board, at the first puzzle of its kind (two ordered
    piles at merge sort, the quickest trip at Dijkstra, a sorted list's repeats at the in-place dedupe).
  - *Be the cache*: the player serves get and put requests through a cache of two to four slots, the way the code
    does: a hash map from key to node and a list from the head (used last) to the tail. Every operation is a drag: the
    request onto its node (a hit moves it to the head), onto "return −1" (a get that misses), onto head (a new key) or
    onto the database; a node into the evict bin or onto the database; a database row onto head. Four kinds: LRU (a
    full cache evicts the tail), LFU (the fewest uses, nearest the tail on a tie, each node showing its uses),
    write-through (a miss reads the database, every put is written at once) and write-back (a put marks the node dirty,
    ●, and a dirty node is written back only as it is evicted). The code runs beside it with its lines lit, and a log
    says what each operation did; a wrong one names the rule (LRU evicts the tail; key 3 is dirty, write it back
    first). Nine puzzles and the endless run; discoveries: LFU sparing the oldest, a dirty node written back, fewer
    database writes than puts, write-through writing every put, a hit moving to the head.
  - *Be the load balancer*: the player is the balancer, dragging each request onto the server the code picks, with
    the servers side by side (their index, what each was sent) and the events to come. Four kinds: round robin (a
    pointer i under the servers, skipping one that goes down), least connections (each request stays open for a
    number of requests, shown as blocks on its server; the fewest open wins, the first on a tie), nginx's smooth
    weighted round robin (drag +w onto cw[] so every cw gains its weight, then send to the largest cw, which gives
    back the total) and IP hash (hash mod the number of live servers indexes live[], so a client comes back to the
    same server). Servers going down and connections ending happen by themselves and are logged. A wrong server
    names the rule (i = 2: round robin sends to C; 13 mod 2 = 1: live[1] is C). Nine puzzles and the endless run;
    discoveries: skipping a down server, a full smooth cycle bringing every cw back to 0, least connections evening
    open work rather than counts, a client remapped when a server goes down, sticky sessions, wrapping round.
  - *Be the hash ring*: consistent hashing on a ring of positions 0 to 99, drawn as a circle with the servers on it in
    their colours and each key as a tag inside it at its hash, beside a sorted ring[]. Every operation is a drag: a
    new key onto the first server clockwise from its hash (round past 99 to the first if none is after it), or, when a
    server joins or leaves (that happens by itself), each key that has to move onto its new server; the keys to move
    can go in any order, and a key that doesn't move is refused ("bee stays on B: walking clockwise it still meets B
    before D"). Four kinds: lookups, a server joining (only the keys between it and the server before it move), a
    server leaving (its keys go to the next one clockwise) and virtual nodes (each server at two points, A1 and A2).
    Nine puzzles and the endless run; discoveries: fewer keys moved than hash mod n would move, a leaving server's
    keys all going to its successor, a server taking keys at two points, a key wrapping round past 99.
  - *Be the rate limiter*: the player decides each request on a timeline of seconds (each request a dot: grey to
    come, green let through, red rejected), first doing the clean-up the code does: drag the clock onto the token
    bucket to add the whole tokens earned, or onto the counter when a new fixed window starts (the windows shaded on
    the timeline), drag sliding-log times W seconds old into drop (the last W seconds bracketed), or let the leaky
    bucket's queued requests out as their leave times pass; then drag the request onto allow or reject. A wrong move
    names the rule ("(4 − 0) // 3 = 1: refill the bucket first"; "log[0] = 1 > 3 − 4: it's still inside the window").
    Nine puzzles and the endless run; discoveries: a burst through a full bucket, twice the limit across a fixed
    window's edge, the sliding log rejecting what a fixed window lets through, a burst queued and let out steadily.
  - *Be the replicas*: the player is the coordinator of a store kept on N replicas, each showing its value and version
    (the newest marked) and the order a request reaches them in. A write goes down its preference list (skipping a
    replica that is down) until W have it; a read asks R the same way, then the player drags the newest reply onto
    return and the value returned onto each replica that replied with an older one (read repair). With fewer than W
    (or R) replicas up the request goes onto fail. Four set-ups: N = 3 with W = R = 2, W = R = 1 (fast, but a read can
    come back stale: R + W ≤ N), W = 1 with R = 3, and N = 5 with W = 4, R = 2 while replicas go down and come back.
    Nine puzzles and the endless run; discoveries: a stale read, a read meeting an old reply and the newest, a request
    failing for want of replicas, a read repair.
  - *Be the message queue*: a partitioned log with a consumer group, as Kafka keeps one: each partition a row of
    messages by offset, with its committed offset (a green bar), its owner's next read (an arrow) and its owner named.
    The player drags a sent message onto partition hash(key) mod P (shown on the card), a polling consumer's next
    message (from its first partition with one unread) onto the consumer or the poll onto empty, and a commit onto
    each partition the consumer has read past its bar. Crashes and joins happen by themselves: the partitions are
    shared out again by range and each new owner starts at the committed offset, so what was read but not committed is
    read again. Four kinds: keys only, a group of two, commits with a crash, a consumer joining. Nine puzzles and the
    endless run; discoveries: a message delivered twice (at least once), a partition moving, an empty poll, two
    consumers reading at once, one key's messages kept in order.
  - *Name the component*: Name the pattern for system design. The player reads a requirement ("The product page reads
    the same price from the database 40 thousand times a minute") and drags its card onto the building block that
    meets it, one of twelve tiles (cache, CDN, load balancer, message queue, read replicas, sharding, database index,
    rate limiter, consistent hashing, search engine, object storage, WebSocket). A wrong tile says what that component
    is for; a right one shows the clue that gave it away and adds what it is for to a sheet beside the board.
    Thirty-six requirements, three per component, in three languages. Nine rounds, the later ones with look-alikes
    (faster reads: a cache, a CDN or an index; more machines: a balancer, replicas or shards; finding: an index or a
    search engine). A requirement whose component has a game of its own gets "▶ Play it", which opens that game
    beside it at the puzzle of its kind (a server dying at round robin with one down, a burst at the token bucket).
  - *Long division, step by step*: any whole number divided by up to 9999, to up to 10 decimal places, in the bracket,
    corner or short layout (remainders as mixed numbers, repeating decimals such as 1 ÷ 7 = 0.(142857)), stepped
    forward and back; "Your turn" asks for each quotient digit first and answers a
    wrong one with the multiplication or subtraction that shows why. With 🧱 blocks (up to 999 ÷ 9) the pupil shares
    hundreds, tens and ones into the groups by hand: drag a block into a group (or tap it to deal it), drop one that
    can't go round on "1 → 10" to change it for ten of the next place, and the written working fills in as each place
    is shared out
  - *Rubik's cube*: a cube to turn, drawn twice — in 3D (click a sticker to turn its face, drag to look round it) and
    on Borromean rings: three bands of three circles, one per axis, each face's nine dots where two bands cross, so a
    turn slides the twelve stickers beside the face along one circle (hover a face to see it). Turn with U D L R F B (↺ for R′), undo, scramble or go back to
    solved; type moves such as R U R′ U′ to do them, see their order (the lcm of the cycles the stickers go round:
    6 for R U R′ U′, 105 for R U) and repeat them until the cube comes back. Under it, the 43 252 003 274 489 856 000
    positions and God's number, 20
  - *Soroban*: a Japanese abacus of 3 to 13 rods: click a bead to push it to the beam or away, and the number (and,
    if wanted, each rod's digit) is written underneath. "Add" and "Take away" step through a sum a rod at a time from
    the highest place, saying whether the beads go straight on or off or need a friend of 5 (+4 = +5 − 1) or of 10
    (+7 = +10 − 3, carrying 1 to the left), or both; "Show a number" asks for one and says when the beads show it
  - *Algorithm patterns*: the fifteen patterns behind most interview problems (prefix sums, two pointers, a sliding
    window, fast and slow pointers, reversing part of a linked list, a monotonic stack, the top k with a min-heap,
    merging intervals, binary search on a rotated array, tree traversals, depth- and breadth-first search, flood fill,
    backtracking and dynamic programming), one at a time, each with LeetCode's example. Click a number, a list node or
    a tree node to change it (an empty box removes it, + adds one, a tree grows by its dashed slots), click grid
    squares to recolour them and ⌖ to pick the start; then step, play, or turn on "Your turn" to say before each move
    what happens next (which pointer moves, pop or push, merge or start a new interval, which half to search, the next
    node or number), with the reason given for a right answer
  - *Interview problems*: AlgoExpert's 200 coding questions in its fifteen categories (arrays, binary search trees,
    binary trees, dynamic programming, famous algorithms, graphs, greedy algorithms, heaps, linked lists, recursion,
    searching, sorting, stacks, strings, tries) and SystemsExpert's system design — 24 fundamentals as simulations to
    run (a cache evicting by LRU, LFU or FIFO, keys on a hash ring, a token bucket, a Raft election, a map-reduce job,
    a TLS handshake in small numbers…) and its 13 design questions walked through (requirements, estimates worked out
    from the numbers typed in, the architecture a box at a time, the main requests followed through it). Pick a
    category and a problem, type its inputs, then step or play through the solution: cells with pointers, a linked
    list, a tree, a grid, a table, a graph or an architecture diagram, with a note on every step and the answer at the
    end. "Your turn" asks before every step what happens next, choosing between the kinds of step the solution takes
    (too small so L moves right, a triplet, too big so R moves left), or, where every step is of one kind, the number
    it comes to. 🧗 "Solve it" works a coding question out instead of watching it, with the key idea hidden: work the
    example by hand, name the technique (one of 28, from hash sets and two pointers to monotonic stacks, tries and
    dynamic programming, with a hint and, for a wrong pick, what that technique is for), say what trying everything
    would cost, make a plan of one's own and only then open the key idea, step through the solution answering before
    every step, and say what the solution costs in time and in extra memory; at the end, how many answers were right
    first time and on to the next problem
  - 📷 puts a picture of the piece beside it (the graph comes as an ordinary graph, editable in the graph tool, with
    the sliders' values put in); the graph, the experiment and long division are in the Algebra, Discrete and
    Arithmetic menus too
- **📐 Shapes**: a tab in the board's side panel (next to Excalidraw's Library) with 72 ready-made maths pieces in
  seven groups — a ruler, half and full protractors with both scales, set squares and a clock face; axes with a grid,
  the first quadrant, axes for sketching, 3D axes, number lines, the unit circle, square grid paper and isometric dot
  paper; angles, labelled triangles (one with opposite, adjacent and hypotenuse marked), parallel lines with a
  transversal and with angles a to h, circle parts, regular polygons and quadrilaterals with their equal-side and
  parallel marks; a cube, cuboid, cylinder, cone, sphere, pyramid and prism with hidden edges dashed, and the nets of
  five of them; a fraction wall, fraction circles, a ten frame, a hundred square, place-value blocks and chart, a bar
  model, a part–whole model and a multiplication square; algebra tiles for x², x, y, xy and 1, and −x², −x and −1,
  balance scales and a function machine; Venn diagrams, a tree diagram, a two-way table, a box plot, a spinner, dice,
  a probability scale and a two-dice sample space. Click one to add it in the middle of the view or
  drag it into place. They arrive as ordinary Excalidraw elements in one group, so every line and label can be
  moved, recoloured or retyped; they follow the board into dark mode, and the few words on them (the probability
  scale's, the sides of a trigonometry triangle) are in the board's language
- **Libraries**: Excalidraw's Library tab is kept in the browser between visits (and in step across tabs), and
  *Browse libraries* adds sets from libraries.excalidraw.com (“Math Teacher Library”, “Mathematical Symbols”,
  “3d coordinate systems + graphs”…) straight to the open board's library; that's the one thing that needs the
  internet
- Dialogs work from the keyboard: focus moves in and back, Tab stays inside, arrow keys move between tabs and options;
  on a phone they take the whole screen
- On a dark board the pictures turn dark too (and back again), and Georgian text in them uses the system's Georgian font
- Formulas and graphs stay editable: double-click one (or use the *Edit* button) to change it
- Boards autosave to SQLite on your own server; works fully offline (no CDNs)

## Screenshots

The dialogs show a live preview; a step slider reveals the working one step at a time.

<table>
<tr>
<td align="center" valign="top"><img src="docs/screenshots/dialog-graph-theory.png" width="430" alt="Graph theory dialog"><br><sub>Graph theory: type edges, pick a layout</sub></td>
<td align="center" valign="top"><img src="docs/screenshots/dialog-georgian.png" width="430" alt="The interface in Georgian"><br><sub>The whole interface is available in English, Russian and Georgian</sub></td>
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

Open http://localhost:8787. Data lives in the `data` Docker volume; the container reports its health from `/api/health`.

**Without a password, anyone who can reach the port can read, change and delete every board.** That is fine on your own
computer; on a network, set one (HTTP basic auth, any username):

```bash
APP_PASSWORD=choose-something docker compose up -d --build
```

Basic auth sends the password with every request, so on a shared network put Zeno behind HTTPS. With
`BIND_ADDRESS=127.0.0.1` the port only listens on the machine itself, and a reverse proxy serves it to the network.
A minimal Caddyfile for a local network with no domain (Caddy's own certificate authority; install its root
certificate, `pki/authorities/local/root.crt` in Caddy's data folder, on the devices that use Zeno):

```caddyfile
:8443 {
	tls internal {
		on_demand
	}
	# The app's own files come pre-compressed; this compresses the API's JSON and CSV too.
	encode zstd gzip
	reverse_proxy 127.0.0.1:8787
}
```

With a domain pointing at the server, `zeno.example.org { reverse_proxy 127.0.0.1:8787 }` gets a trusted
certificate automatically.

Behind a proxy, also set `TRUST_PROXY=1`. Wrong passwords are limited per client: after 10 in 10 minutes, that
client gets 429 and waits until the oldest leaves the window, without its password even being checked. Behind a
proxy, every request arrives from the proxy's address. Without `TRUST_PROXY`, a class mistyping the site password
would lock itself out together. With it, Zeno counts per client, using the address the proxy adds last to
`X-Forwarded-For`; a client can't forge that one.

```bash
APP_PASSWORD=… TEACHER_PASSWORD=… BIND_ADDRESS=127.0.0.1 TRUST_PROXY=1 docker compose up -d --build
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

Environment variables:

- `PORT`: 8787 by default.
- `DATA_DIR`: `./data` by default.
- `STATIC_DIR`: `./dist` by default.
- `APP_PASSWORD`: empty means no auth.
- `TEACHER_PASSWORD`: empty means anyone can create classes and download the study data; see below.
- `TRUST_PROXY`: 1 behind a reverse proxy, as above.
- `PASSWORD_ATTEMPTS` and `PASSWORD_WINDOW_MINUTES`: 10 and 10 by default.
- `BACKUP_KEEP`: daily backups to keep, 7 by default; 0 turns them off.

The build writes `.br` / `.gz` copies of the assets, and the server sends those to browsers that accept them. Each tool and each
language is a separate chunk, loaded the first time it is used.

**Read-only links.** **🔗 Share** on a board makes a link that shows it in view mode. The link follows the board as
you save, so a class can follow along on their own devices, and **Stop sharing** ends it. It is for showing, not
for keeping a board private. Anyone who can open Zeno can open the board itself; see [docs/api.md](docs/api.md).

Autosave doesn't silently overwrite: if the board was saved in another tab or on another device since you opened it, Zeno pauses
saving and asks whether to reload that version or keep yours. Saves go one at a time; a failed one is retried (2 s, 5 s, 15 s,
30 s, and as soon as the browser is back online), and closing the tab with unsaved changes asks first.

Backups:

- **A daily copy.** Once a day, and when it starts, the server writes a copy of the whole database (boards and
  study data) to `DATA_DIR/backups/`, keeping the newest seven. The copy is made with SQLite's `VACUUM INTO`, which is
  safe while the server is running. The copies sit on the same disk, so also copy that folder somewhere else.
- **Boards as JSON.** The home page links to `/api/export`, every board in one JSON file.

The database records its schema version, and a newer Zeno's database is refused rather than misread. The server sends a Content-Security-Policy and the
usual security headers, accepts only JSON request bodies (so a form on another site can't post to it) and refuses scenes it
couldn't load back.

## Class study

Zeno can run a study that compares two ways of choosing practice questions: an adaptive learner model (aiming at a
target chance of a right answer, as in Math Garden) against a fixed curriculum sequence. A teacher makes a class at
**`#/teacher`**, choosing the areas it practises or grades of the course (grades 1 to 8, 9–10, 11–12 and university;
every skill has each of its three levels tagged with the grade that teaches it, from Singapore's syllabuses, in
`src/model/curriculum.ts`). Students join with its code, are randomised to a condition in balanced blocks and get a code of
their own (no names or emails), see what taking part means and agree before they join. The teacher then moves the
class through a pre-test, timed practice and a post-test, with parallel forms counterbalanced within each condition.
The dashboard shows the two groups, mastery by skill, the tests and how well the model predicts; both data sets
download as CSV.

The full description is in **[docs/study.md](docs/study.md)**:

- how a study runs, and the API calls behind it;
- the analysis, fixed in advance (`npm run analyse`);
- the learner model, judged on held-out students against a logistic model, PFA, BKT and baselines, on simulated
  classes and on the public ASSISTments data (`npm run model`; `docs/evaluation/prediction-benchmark.md`);
- the simulation study across three kinds of simulated learner, and its power analysis (`npm run simulate`);
- a dry run of the whole study through the real server (`npm run dry-run`);
- the answer checker against a teacher's marking, and how often it names the mistake a teacher sees (`npm run checker-agreement`);
- which mistakes each group made, from either export (`npm run mistakes`).

More for a thesis: [docs/architecture.md](docs/architecture.md) (design, diagrams, decisions),
[docs/api.md](docs/api.md) (every route), [docs/thesis/](docs/thesis/) (outline, references) and
[docs/evaluation/](docs/evaluation/) (the usability study protocol).

## Tests

```bash
npm test           # node:test, no extra dependencies
npm run test:changed   # only the test files that import (or read) something changed since main; -- --list to see them
npm run typecheck
npm run lint       # ESLint: recommended, typescript-eslint, React's rules of hooks
npm run coverage   # the tests, failing below 95 % of lines / 88 % of branches / 95 % of functions in src/math and src/model
npm run build && npm run e2e   # Playwright: the built app in Chromium against a fresh server (npx playwright install chromium first)
```

Coverage today is about 97 % of lines, 91 % of branches and 97 % of functions in `src/math` and `src/model`. Server
code runs in spawned servers, which Node's coverage doesn't follow, so it is tested but not measured. The end-to-end
tests cover two journeys:

- **A board:** make a board, add a shape and a live piece, use the piece, and find it after a reload.
- **The class study:** a teacher makes a class; a student agrees, joins and answers a question that reaches the
  server; then the teacher starts the pre-test and the student gets it.

The tests check that every example of every tool renders in English, Russian and Georgian; that the three languages have the same
keys; the logic parser; the NAEC 2025 answers; complex-number arithmetic against mathjs; that solved equations and
inequalities satisfy the input, expansions and factorisations multiply back and all four quadratic methods agree;
that simplified powers, surds, standard forms and logarithms keep the value of the input, and that solutions of exponential
and log equations satisfy them (with false roots thrown out); that midpoints, lines, feet of perpendiculars, meeting points,
centres, radii and areas from coordinate geometry agree with the input; that the angles, areas, volumes, meeting points,
feet of perpendiculars and distances from the vectors tool match plain floating-point geometry; that terms, sums, sums to
infinity, telescoping sums, "first n" answers and recurrence limits match adding and iterating term by term; that points inside a stated domain
give values and points outside don't, every value lands in the stated range, f(f⁻¹(y)) = y, transformed key points lie
on the new graph and stationary points have f′ = 0; that true trig identities built from random expressions are
proved and false ones refused, every solution of a trig equation satisfies it and no sign change is missed, and
R-forms, exact values and values from given ratios match plain floating-point trigonometry; that random polynomial
divisions satisfy dividend = divisor × quotient + remainder, unknown coefficients come back from their conditions, every
root of a cubic or quartic is a root and no sign change is missed, polynomial inequalities agree with the sign of f,
binomial expansions and series match arithmetic, the points where a line meets a curve lie on both (as many as the
discriminant says) and partial fractions add back up to the fraction; that circle theorem answers obey the theorems and match the angles
measured on the figure drawn from them, unknowns in x come back, similar triangles keep one scale factor and the
congruence and similarity tests decide correctly, images of rotations, enlargements, reflections and translations
match the formulas and describing an image finds the transformation that made it, volumes and surface areas match the
formulas and a length found from a volume gives it back, and constructions and loci satisfy their conditions; that a change of sign is reported exactly when there is one
(breaks, touching roots and hidden pairs caught), bisection, false position, Newton–Raphson, the secant method and
fixed-point iteration land on the true root rounded correctly with every step following its formula, flat tangents,
cycles and divergence are recognised, the trapezium, mid-ordinate and Simpson's rules match their formulas, are exact
where theory says, err the way f″ says and shrink at orders 2 and 4, and difference quotients match theirs; that derivatives of hundreds of random expressions
match numerical ones, and stationary points, tangents and the chain rule agree with them; that areas, volumes,
distances travelled, optima and rates match independent numerical computations; that the normal, t and χ²
functions match tables and closed forms, a two-sided test rejects exactly when the interval misses μ₀, Welch, paired,
pooled and χ² statistics match their formulas, the n for 80 % power is just enough and about 95 % of simulated 95 %
intervals catch μ; that every practice question (93 skills × 3 levels × 60 seeds) accepts its own answer and
rejects a wrong one, answers in other forms are judged fairly and wrong forms are named, and every worked solution
renders; that every known mistake is named in the questions that can produce it, still counts as a miss, is never the
right answer and never hides a form message, and inequalities and standard form are read however they are typed; that no picture repeats an attribute; that
dark pictures turn back into the same light ones; and the API: conflicts, compression,
bad requests, path traversal, password, headers and export; and the class study: the teacher password, randomisation
in balanced blocks, attempts refused when they don't add up, summaries worked out from the answers, retried uploads
stored once, deletion, an export without sign-in codes, and an outbox that keeps attempts in order until they are sent;
and the learner model: ratings move the right way by shrinking steps, an untried skill starts from the area, levels keep
their order, the metrics match hand-worked values, the export reads back into the model, and on simulated learners it
beats every baseline, is calibrated within 0.05, and ranks the true difficulties (ρ > 0.9) and students (ρ > 0.85);
and class practice: the curriculum covers every skill with prerequisites first, the fixed sequence walks level by level,
the adaptive choice aims at the target, moves on after mastery, goes up and down a level and interleaves, a class's
skills and plan come back right, attempts must match the student's condition, the browser moves its plan on as the
server will, a database from before class practice is upgraded, and simulated studies treat both conditions alike;
and the dashboard: teacher-only, mastery for every student and skill, group figures and logged-prediction calibration
that match hand-worked values; and the protocol: the forms are stable, parallel and spread over the skills, every test
question accepts its own answer in all three languages, phases and sessions are the teacher's alone, forms are
counterbalanced within each condition, each test question is stored once and worked out by the server, the server
marks every answer itself and keeps the browser's verdict where it differs, a test can't be answered before it starts
and what arrives long after its phase is marked late, typed answers can't become spreadsheet formulas, and the
dashboard's test figures match; and the evidence: the CSV reader survives
any split of its input, the ASSISTments importer keeps the right rows, the held-out split keeps students whole, PFA
and BKT match hand-worked steps and BKT's fit recovers the parameters its data came from, the ANCOVA, Welch's test and
t quantiles match hand-worked values and printed tables, every simulated world teaches and every arm runs, a dry run
of the whole study through the server keeps every guarantee, and the answer checker agrees with a teacher's marking
of 701 typed answers at least 89 % of the time, crediting at most two wrong answers, and names every mistake a
teacher names in them and almost none that a teacher doesn't. GitHub Actions runs the typecheck,
lint, tests with coverage, build and end-to-end tests on every push, and builds the Docker image, saves a board in
it and checks that it marks a practice answer itself.

## Project layout

```
server/index.ts           HTTP server: /api/boards CRUD (SQLite) + static files
server/research.ts        class study: classes, students randomised to a condition, practice attempts, CSV export
src/learner.ts            the student's side of the study: question log, attempt records, outbox kept until sent
src/model/elo.ts          the Elo model the app ran before and the thesis simulations run: ratings of students and questions, mastery
src/model/evaluate.ts     replay, metrics (log-loss, RMSE, AUC, calibration), baselines, reading the CSV export
src/model/logistic.ts     the learner model: a logistic model (counts, recency, gap, question difficulty) and a mastery rule on its score
src/model/classModel.ts   the learner model as the app runs it: starting weights from a simulated class, refitted as answers come
src/model/simulate.ts     synthetic learners with a known truth, for tests and the simulation study
src/model/curriculum.ts   the fixed order of the skills and what each builds on
src/model/policy.ts       choosing the next question: fixed sequence or adaptive (target chance, mastery, prerequisites)
src/components/StudentPanel.tsx  joining a class, signing back in, deleting your answers
server/dashboard.ts       the teacher's dashboard data: mastery per student and skill, the two groups, tests, calibration
server/protocol.ts        the study protocol: class phases (logged), timed sessions, counterbalanced test forms, test answers
server/marking.ts, checker.ts  every answer marked again on the server with the browser's checker (bundled for Docker)
src/model/testForms.ts    the pre-/post-test forms A and B, built from the class code
src/components/TestRunner.tsx  taking a test: one question at a time, no marks, form messages only
src/pages/TeacherPage.tsx the teacher's page (#/teacher): classes, codes, groups, mastery heatmap, calibration
src/components/MasteryHeatmap.tsx, CalibrationChart.tsx, ChartTip.tsx  the dashboard's charts and their readouts
src/model/datasets.ts     public data sets (ASSISTments) as observations, read as a stream
src/model/analysis.ts     the study's planned analysis: ANCOVA, Welch's test, least squares, scores from the export
src/math/distributions.ts normal, t and χ² tails and their inverses (no imports, for the server and scripts too)
scripts/evaluate-model.ts `npm run model`: the model against the logistic model, PFA, BKT and baselines on held-out students
scripts/benchmark.ts      `npm run benchmark`: the benchmark CSVs in docs/results (prediction, paired splits, mastery rules) for the dashboard
scripts/import-assistments.ts  `npm run import-assistments`: the ASSISTments file as observations
scripts/simulate-study.ts `npm run simulate`: the conditions on simulated classes, across worlds and assumptions; power
scripts/analyse-study.ts  `npm run analyse`: the planned analysis on the tests export
scripts/dry-run-study.ts  `npm run dry-run`: the whole study with simulated students through the real server
scripts/checker-agreement.ts  `npm run checker-agreement`: the answer checker against labelled answers
scripts/mistakes.ts       `npm run mistakes`: the known mistakes in an export's wrong answers, per condition
scripts/thesis-figures.ts `npm run figures`: the thesis figures (diagrams, calibration, screenshots) made again from the code
scripts/dashboard.ts      `npm run dashboard`: the results dashboard's data: chapter 3's tables, the simulation CSVs, verdicts, learning profiles
src/math/mistakes.ts      the mistakes the checker names (each question lists the answers they would give)
docs/study.md             the class study in full: protocol, analysis, learner model, simulations, dry run, checker
docs/architecture.md      design, diagrams (context, building blocks, data model, a question end to end), decisions
docs/api.md               every HTTP route (checked against the server by tests/api-docs.test.ts)
docs/thesis/              a chapter plan mapping the thesis to the code and evidence; references.bib
docs/evaluation/          the usability study protocol (tasks, SUS in three languages, results template)
docs/results/             the simulation results docs/study.md quotes, as CSV
src/pages/HomePage.tsx    board list
src/pages/BoardPage.tsx   whiteboard, autosave, inserting & editing pictures, dark pictures, tool search
src/tools.tsx             every tool in one table: dialog (loaded on demand), menu entry, edit label, search topics
src/components/ui.tsx     shared dialog controls: Tabs, Segmented, startOr
src/components/CommandPalette.tsx  the tool search (Ctrl+K or /)
src/math/shapes.ts        the ready-made maths shapes (instruments, axes, figures, solids, number, algebra, data)
src/components/ShapesPanel.tsx  their side-panel tab: thumbnails, click or drag onto the board
src/math/live.ts          the live pieces' arithmetic: geared clock, chance devices and tallies, dot multiplication
src/math/liveGraph.ts     the live graph's letters, curves, zoom and frozen copies (mathjs)
src/math/rubik.ts         the Rubik's cube: face turns as sticker permutations, moves read and written, orders,
                          scrambles, and the dots of the Borromean-rings picture
src/math/soroban.ts       the soroban: digits on the rods, bead clicks, and sums a rod at a time with the friends of 5
                          and 10
src/math/patternSteps.ts  the algorithm patterns as frames to step through, with the questions for "Your turn"
src/math/problems/        the interview problems: core.ts (inputs, frame helpers), one file per category, index.ts,
                          and solve.ts (each coding question's techniques and costs, the solve ladder's questions,
                          and "what happens next?" before every step)
src/live/scenes.tsx       the pictures of a frame (cells, rows, list, tree, grid, table, graph, architecture)
src/math/descentLab.ts    the gradient descent lab: steps with momentum, the nine puzzles and how a try is judged,
                          free play's functions, and the picture
src/math/pcaLab.ts        the PCA lab: PC1 and least squares from the covariance, a line's error and kept spread,
                          the eight puzzles and how a check is judged, and the picture
src/math/softmaxLab.ts    the softmax lab: softmax with a temperature, the loss and its gradient, the eight puzzles
                          and how a check is judged, and the picture
src/math/embedLab.ts      the embeddings lab: cosine, nearest words and analogies, the eight puzzles and how a check
                          is judged, the readout, and the picture
src/math/backpropLab.ts   the backprop lab: the graphs' forward and backward passes, the eight puzzles and how a
                          check is judged, free play's nudge, the hints, and the picture
src/math/tensorLab.ts     the tensors lab: shapes, views and their strides, places and indices, the eight puzzles and
                          how a check is judged, free play's walk, and the picture
src/math/fitLab.ts        the overfitting lab: points from a hidden curve, ridge fits, test, cross-validation, bias and
                          variance errors, the eight puzzles and how a check is judged, and the picture
src/math/batchLab.ts      the batch training lab: data, the mean squared error and its gradient, training in batches
                          with schedules, momentum and Adam, the six puzzles and how a run is judged, and the picture
src/math/rocLab.ts        the threshold lab: scores, the confusion matrix and its measures, ROC with AUC and the
                          precision–recall curve, the six puzzles and how a check is judged, and the picture
src/math/knnLab.ts        the nearest-neighbours lab: the datasets, distances, the vote, accuracy on test points,
                          distances in many dimensions, the six puzzles and how a check is judged, and the picture
src/math/treeLab.ts       the decision-tree lab: impurity, cuts and the best cut, trees by hand and grown greedily,
                          forests, the six puzzles and how a check is judged, and the picture
src/math/kmeansLab.ts     the k-means lab: assign and move, runs, random and k-means++ starts, the lowest error for
                          each k, the disc's own cluster, the five puzzles and how a check is judged, and the picture
src/live/                 live pieces on the board: Excalidraw embeddables drawn in React, state in customData
src/math/latex.ts         LaTeX → SVG (MathJax)
src/math/plot.ts          functions → SVG plot (mathjs)
src/math/models.ts        Singapore-method models → SVG (bar model, fractions, percent, number bond)
src/math/ode.ts           differential equations: slope fields, Euler, first/second order, phase planes
src/math/integration.ts   integration techniques: substitution, by parts, partial fractions, trig substitution
src/math/statistics.ts    statistics & probability pictures: data, scatter, chance, trees, distributions, CLT
src/math/inference.ts     inference: confidence intervals, coverage, z/t/proportion tests, two samples, χ², power
src/math/practice.ts      practice: question generators, answer checking, worksheets; practiceSolve.ts draws solutions
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
src/math/algo.ts          algorithms: specs, presets, words (renderers in the algo*.ts files below)
src/math/algoArrays.ts    sorting, searching, stacks/queues/hashing, DP tables, complexity + cell/table helpers
src/math/algoGraphs.ts    graph algorithms (BFS, DFS, Dijkstra, Bellman–Ford, Floyd–Warshall, Prim, Kruskal, union–find,
                          topological sort), BST/AVL, heaps
src/math/algoRecur.ts     recursion trees (Fibonacci, factorial, Hanoi), N-queens, subset sum
src/math/algoStrings.ts   string matching: naive, KMP, Rabin–Karp
src/math/algoPatterns.ts  patterns: two pointers, fast & slow pointers, sliding windows, prefix sums, monotonic stack, Kadane
src/math/graphtheory.ts   graph theory: properties, Euler, Hamilton, colouring, walks, spanning trees
src/math/logic.ts         logic: parser, truth tables, equivalence, Karnaugh maps / minimal forms, circuits, arguments, Venn
src/math/logicArgue.ts    strengthen / weaken: the unstated premise, pattern cards, options judged by support
src/math/logicPuzzles.ts  constraint boards (bins / slots, sweep, "if …") and truth-teller / liar puzzles
src/math/logicSyllogism.ts categorical syllogisms: mood / figure, three-circle Venn, rules, what follows
src/math/logicSquare.ts   the square of opposition and immediate inferences, from the Venn regions of two terms
src/math/logicTree.ts     truth trees (semantic tableaux): stacking and splitting rules, closed and open branches
src/math/logicGrid.ts     logic grids: categories and clues, every answer counted, steps worked out as a person does
src/math/logicMill.ts     Mill's methods: agreement, difference and joint method on a table of cases, concomitant
                          variation as scatters with r, residues as a bar model
src/math/combinatorics.ts counting, Pascal's triangle, stars and bars, inclusion–exclusion, Catalan/Stirling/partitions
src/math/numtheory.ts     number theory: sieve, factorization, gcd/Bézout/Diophantine, modular arithmetic, CRT, bases
src/math/trig.ts          trigonometry: unit circle, right triangles, laws of sines/cosines, graphs, equations
src/math/vectorspace.ts   span, subspaces, coordinates, Gram–Schmidt, eigenvalues (exact) + ℝ²/ℝ³ pictures
src/math/algebra.ts       equations & polynomials: linear, inequalities, expanding, factoring, quadratics (exact)
src/math/svg.ts           SVG data URLs and the dark-board version of a picture
src/math/complex.ts       complex numbers: forms, operations, powers, roots, quadratics, Euler's formula
src/math/powers.ts        powers, roots & logs: index laws, scientific notation, surds, logarithms, exponential equations
src/math/functions.ts     functions: domain & range, composites, inverses, transformations, curve sketching + pictures
src/math/identities.ts    trig identities: exact values, R-form, proofs, equations (exact surds) + pictures
src/math/polynomials.ts   polynomials: division, factor/remainder theorems, cubics & inequalities, binomial, line & curve,
                          partial fractions (exact) + pictures
src/math/euclid.ts        school geometry: circle theorems, similarity & congruence, transformations, surface area &
                          volume, constructions & loci + figures
src/math/numerical.ts     numerical methods: change of sign, bisection, Newton–Raphson, iteration, trapezium &
                          Simpson, numerical derivatives + pictures
src/math/ai.ts            math for AI: tensors (order, shape, strides, slices, picking an entry, matrix rank),
                          their operations (reshape, permute, reductions, broadcasting, @), gradient descent (rates,
                          momentum, verdicts, curvature), backpropagation (computational graphs, the chain rule),
                          softmax with cross-entropy, embeddings (cosine similarity, nearest neighbours,
                          analogies) and SVD with PCA (Jacobi SVD, rank-k approximation, principal components)
                          + pictures
src/math/sequences.ts     sequences & series: rules, arithmetic, geometric, Σ notation, recurrences (exact) + pictures
src/math/coordgeom.ts     coordinate geometry: points, lines, parallel/perpendicular, intersections, circles, shapes
src/math/vectors.ts       vectors in 2D/3D: combinations, dot and cross products, lines, planes (exact) + pictures
src/math/expr.ts          expressions in x: parser, LaTeX, tidy-up and simplifier, exact a + b√s, real roots of polynomials
src/math/derive.ts        derivatives: rules one level at a time, first principles, chain, tangents, stationary points
src/math/multivar.ts      several variables: partial derivatives, gradient, chain rule as a graph, Jacobian, Hessian,
                          convexity and stationary points, Lagrange multipliers
src/math/randvar.ts       random variables: tables and densities, E and Var, aX + b, joint tables, covariance matrix
src/math/likelihood.ts    maximum likelihood: a coin, a normal, Poisson counts, least squares and log loss as MLE
src/math/information.ts   information: surprise and entropy, a coin, cross-entropy, KL divergence, log loss
src/math/regression.ts    regression: several features, polynomial and one-hot features, logistic regression, reading weights
src/math/applied.ts       applied calculus: areas, volumes of revolution, motion, optimisation, related rates
src/math/mental.ts        mental math: base multiplication, division (base, flag, Trachtenberg), divisibility,
                          reciprocals, digit-sum check, roots, cubing, magic squares, Major System
src/math/tactics.ts       problem-solving tactics: symmetry, the extreme principle, pigeonhole, parity, mod 3, colouring, a monovariant
src/math/strategies.ts    problem-solving strategies: Pólya's four phases, Zeitz's start-up strategies on sample problems
src/math/matrix.ts        matrix operations → LaTeX with worked steps
src/math/transform.ts     2×2 matrix as a plane transformation → SVG
src/three/                3D: spec + formulas (spec.ts), scene building (build.ts), viewer & PNG snapshot (viewer.ts)
src/i18n.tsx              language provider; strings in src/locales/{en,ru,ka}.ts, loaded on demand
tests/                    npm test (node:test); scripts/ts-register.mjs lets Node import the app's .ts files
```

## Roadmap ideas

- Practice: more skills (complex numbers, matrices), timed quizzes
- Class study: a delayed post-test (retention), re-scoring test answers offline with the current checker
- Spaced repetition of key formulas
- Real-time collaboration (Yjs), teacher-written questions
- Parametric & implicit plots, points and tangent lines, geometry tools

## License

Copyright © 2026 David Chincharashvili.

Zeno is free software under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later): use
it, change it and share it, self-hosted or not. If you run a modified Zeno for other people over a network, the AGPL
asks you to offer them your modified source. The **Source code** link on the home page does that; point
`SOURCE_URL` in `src/pages/HomePage.tsx` at your own copy.

Versions up to the tag `mit-final` were released under the MIT License, and those versions stay MIT. The bundled
libraries keep their own licenses (Excalidraw, React and three.js MIT; MathJax and math.js Apache-2.0).
