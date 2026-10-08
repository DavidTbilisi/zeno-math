# Zeno

*Math from zero to advanced — every small step counts.*

Zeno's paradox says you need infinitely many small steps to cross a room — and yet you get there.
Zeno is a free, open-source, self-hostable **math whiteboard for learning on your own**, from
counting with bar models and fractions all the way to graph theory, combinatorics, number theory, functions and curve sketching, polynomials and the binomial theorem, logarithms, sequences and series, circle theorems, similarity, transformations, surface area and volume, constructions and loci, coordinate geometry, vectors, lines and planes, trigonometry and trig identities, real analysis, derivatives, integration techniques and their applications, differential equations, numerical methods, statistics with confidence intervals and hypothesis tests, linear algebra, algorithms & data structures and 3D geometry — with practice questions that check your answers and worksheets for the board.
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
- **🧠 Mental math** — Vedic speed mathematics and the Major System (after the Neural OS notes)
  - *Near a base*: one generator, (B + a)(B + b) = B·(B + a + b) + a·b — the classic two-column layout (offsets, the
    cross, the product, carries and borrows) and an area picture of why it works; any base (10, 100, 50, …)
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
- **🎯 Practice** — questions made fresh for 42 skills in five areas (number, algebra, geometry & trigonometry,
  calculus, probability & statistics), at three levels
  - Type the answer and press Enter: numbers, fractions, mixed numbers, surds, sets of roots in any order,
    points, intervals, and expressions in x that are checked for equivalence (any form of a derivative, any + C)
  - The form counts when the question asks for one: "lowest terms", "simplify the surd", "not fully factorised",
    "multiply out the brackets", "standard form" and "check your rounding" are said, not marked wrong
  - A wrong answer that a known mistake gives is named, with a way to see it: tops and bottoms of fractions added,
    (a + b)² as a² + b², a negative power taken as a negative number, × and ÷ worked from left to right after + and −,
    digits cut off instead of rounded, an inequality's sign not turned round, the right size with the wrong sign, and
    more (17 in all, in [src/math/mistakes.ts](src/math/mistakes.ts)); it still counts as a miss
  - Negative numbers (with temperatures), order of operations, rounding, significant figures, standard form, estimation
    and bounds, and inequalities (typed as x >= 4, 4 ≤ x, −1 < x ≤ 3 or [4, ∞)) are among the skills
  - A live preview shows how the answer was read; two misses show the answer, and the worked solution comes from
    the tool that covers the topic (Algebra, Powers & logs, Derivatives, Coordinate geometry, Inference, …)
  - Progress per skill is kept in the browser, and a missed question comes back three questions later
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
  - *Pigeonhole*: p pigeons in h holes, or numbers sorted into boxes by remainder — two in one box differ by a multiple of n
  - *Colouring*: can dominoes tile a board with squares removed? The chessboard colouring rules it out when the
    colours do not balance; otherwise a search draws a tiling or shows that none exists
- **⇅ Algorithms** — algorithms and data structures, traced step by step with every count shown
  - A step slider on every trace: rows, table rows, graph and tree states, calls and board positions appear one
    step at a time (the newest one highlighted), and the answer is only stated on the last step
  - *Sorting*: bubble, insertion, selection, Shell, merge, quicksort (Lomuto), heap and counting sort — one row
    per pass, split, merge or partition, with arrows showing where every value moved, the partition being worked
    on bracketed, comparisons and swaps counted, and the complexity explained; as cells or as bars
  - *Searching*: binary search with lo / mid / hi on every step (sorting the input first if needed), linear search,
    two pointers (a pair with a given sum) and a sliding window (the best sum of k neighbours)
  - *Graphs*: type edges like `A-B 4, B-C 2`; BFS (levels, queue), DFS (recursion stack), Dijkstra (distance
    table, shortest-path tree), Bellman–Ford (negative edges, early stop, the negative cycle named), Floyd–Warshall
    (all-pairs table, each improvement marked with the vertex it went through), Prim and Kruskal (minimum spanning
    tree, cycle checks), union–find (sets after every edge) and Kahn's topological sort (layered drawing, cycle
    detection); directed or undirected
  - *Trees & heaps*: binary search trees with all four traversals, AVL trees with balance factors and
    LL/RR/LR/RL rotations, and min/max-heaps built by heapify — the tree and the array side by side
  - *Stacks, queues, hashing*: push/pop/peek traces, and hash tables with chaining or linear probing
    (probe sequences, collisions, load factor)
  - *Dynamic programming*: LCS, edit distance, 0/1 knapsack and coin change as filled tables with the
    traceback path — and greedy coin change shown failing where it does
  - *Recursion*: call trees for Fibonacci (repeated calls marked — or cut short with memoisation), factorial and
    the towers of Hanoi (every move numbered); N-queens by backtracking (the first steps, dead ends, the board and
    the number of solutions); subset sum as a take / skip tree with branches over the target cut
  - *Strings*: naive matching (every shift), KMP (prefix table, shifts that skip what is known to match) and
    Rabin–Karp (rolling hash, spurious hits) — character comparisons counted against the naive algorithm
  - *Complexity*: the master theorem with the recursion tree and the work on each level, and growth rates
    from log n to n! with running times at 10⁸ operations per second
- **∑ Formulas** — type LaTeX with a symbol palette and live preview; rendered with MathJax
- **📈 Graphs** — plot up to 6 functions `y = f(x)` with ranges, grid, auto-scaling and asymptote handling
- The tools sit in four menus on the top bar: **Arithmetic** (counting, models, mental math), **Geometry** (geometry,
  school geometry, coordinate geometry, vectors, trigonometry, trig identities, 3D), **Algebra** (formulas, graphs, functions, equations, polynomials, powers & logs, sequences &
  series,
  matrices, complex numbers, analysis, derivatives, integrals, applied calculus, ODEs, numerical methods) and
  **Discrete** (number theory, combinatorics, graph theory, logic, tactics, algorithms, statistics, inference), plus
  **Practice** by area
- **🔍 Find a tool**: Ctrl+K (when nothing is selected) or `/` searches every tool, every tab and names inside them
  ("Dijkstra", "Дейкстра", "quadratic") in the current language, and opens the tool on that tab
- **🎛 Live pieces**: the first group of the Shapes tab, and on the board they answer clicks — click the middle of
  one to use it, drag its edge to move it, and every change is saved with the board and can be undone:
  - *Clock with hands*: drag either hand (they're geared, like a real clock), digital time on or off, snap to five
    minutes, 🎲 for a random time to read
  - *Dice to roll* (one to three, with the totals so far), a *spinner to spin* (2–10 sections, counts per section) and
    a *coin to toss* (heads and tails counted)
  - *Fractions to shade* (a circle or a bar in 1–12 parts, the fraction written under it), a *ten frame* (or two)
    with red and yellow counters that reads 3 + 1 = 4, and a *hundred square* to colour by hand or show the multiples
    of 2–12
  - *Dot multiplication*: two rows of k squares for numbers from k to 2k; tap a square to fill the dots through it,
    and the four steps — add the dots, count each as 2k, multiply the empty squares, add — work out the product
  - *Graph with sliders*: type functions on the board; every letter in them (a, b, c, k…) gets a slider with its own
    range and a ▶ to play it; a point to slide along the curve with its coordinates and tangent gradient; scroll to
    zoom, drag to move
  - *Chance experiment*: a coin, a die (4 to 20 sides), two dice, a spinner or a bag of coloured counters, run ×1, ×10,
    ×100 or ×1000 at a click (up to a million); the results as counts or relative frequencies against theory, and
    "over time" one outcome's relative frequency settling on p on a log scale
  - 📷 puts a picture of the piece beside it (the graph comes as an ordinary graph, editable in the graph tool, with
    the sliders' values put in); the graph and the experiment are in the Algebra and Discrete menus too
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
**`#/teacher`**. Students join with its code, are randomised to a condition in balanced blocks and get a code of
their own (no names or emails), see what taking part means and agree before they join. The teacher then moves the
class through a pre-test, timed practice and a post-test, with parallel forms counterbalanced within each condition.
The dashboard shows the two groups, mastery by skill, the tests and how well the model predicts; both data sets
download as CSV.

The full description is in **[docs/study.md](docs/study.md)**:

- how a study runs, and the API calls behind it;
- the analysis, fixed in advance (`npm run analyse`);
- the learner model, judged on held-out students against PFA, BKT and baselines, on simulated classes and on the
  public ASSISTments data (`npm run model`);
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
intervals catch μ; that every practice question (42 skills × 3 levels × 60 seeds) accepts its own answer and
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
counterbalanced within each condition, each test question is stored once and worked out by the server, typed answers
can't become spreadsheet formulas, and the dashboard's test figures match; and the evidence: the CSV reader survives
any split of its input, the ASSISTments importer keeps the right rows, the held-out split keeps students whole, PFA
and BKT match hand-worked steps and BKT's fit recovers the parameters its data came from, the ANCOVA, Welch's test and
t quantiles match hand-worked values and printed tables, every simulated world teaches and every arm runs, a dry run
of the whole study through the server keeps every guarantee, and the answer checker agrees with a teacher's marking
of 333 typed answers at least 89 % of the time, crediting at most two wrong answers, and names every mistake a
teacher names in them and almost none that a teacher doesn't. GitHub Actions runs the typecheck,
lint, tests with coverage, build and end-to-end tests on every push, and builds the Docker image and saves a board in
it.

## Project layout

```
server/index.ts           HTTP server: /api/boards CRUD (SQLite) + static files
server/research.ts        class study: classes, students randomised to a condition, practice attempts, CSV export
src/learner.ts            the student's side of the study: question log, attempt records, outbox kept until sent
src/model/elo.ts          learner model: Elo ratings of students (overall / area / skill) and questions, mastery
src/model/evaluate.ts     replay, metrics (log-loss, RMSE, AUC, calibration), baselines, reading the CSV export
src/model/simulate.ts     synthetic learners with a known truth, for tests and the simulation study
src/model/curriculum.ts   the fixed order of the skills and what each builds on
src/model/policy.ts       choosing the next question: fixed sequence or adaptive (target chance, mastery, prerequisites)
src/components/StudentPanel.tsx  joining a class, signing back in, deleting your answers
server/dashboard.ts       the teacher's dashboard data: mastery per student and skill, the two groups, tests, calibration
server/protocol.ts        the study protocol: class phases, timed sessions, counterbalanced test forms, test answers
src/model/testForms.ts    the pre-/post-test forms A and B, built from the class code
src/components/TestRunner.tsx  taking a test: one question at a time, no marks, form messages only
src/pages/TeacherPage.tsx the teacher's page (#/teacher): classes, codes, groups, mastery heatmap, calibration
src/components/MasteryHeatmap.tsx, CalibrationChart.tsx, ChartTip.tsx  the dashboard's charts and their readouts
src/model/datasets.ts     public data sets (ASSISTments) as observations, read as a stream
src/model/analysis.ts     the study's planned analysis: ANCOVA, Welch's test, least squares, scores from the export
src/math/distributions.ts normal, t and χ² tails and their inverses (no imports, for the server and scripts too)
scripts/evaluate-model.ts `npm run model`: the model against PFA, BKT and baselines on held-out students
scripts/import-assistments.ts  `npm run import-assistments`: the ASSISTments file as observations
scripts/simulate-study.ts `npm run simulate`: the conditions on simulated classes, across worlds and assumptions; power
scripts/analyse-study.ts  `npm run analyse`: the planned analysis on the tests export
scripts/dry-run-study.ts  `npm run dry-run`: the whole study with simulated students through the real server
scripts/checker-agreement.ts  `npm run checker-agreement`: the answer checker against labelled answers
scripts/mistakes.ts       `npm run mistakes`: the known mistakes in an export's wrong answers, per condition
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
src/math/graphtheory.ts   graph theory: properties, Euler, Hamilton, colouring, walks, spanning trees
src/math/logic.ts         logic: parser, truth tables, equivalence, Karnaugh maps / minimal forms, circuits, arguments, Venn
src/math/logicArgue.ts    strengthen / weaken: the unstated premise, pattern cards, options judged by support
src/math/logicPuzzles.ts  constraint boards (bins / slots, sweep, "if …") and truth-teller / liar puzzles
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
src/math/sequences.ts     sequences & series: rules, arithmetic, geometric, Σ notation, recurrences (exact) + pictures
src/math/coordgeom.ts     coordinate geometry: points, lines, parallel/perpendicular, intersections, circles, shapes
src/math/vectors.ts       vectors in 2D/3D: combinations, dot and cross products, lines, planes (exact) + pictures
src/math/expr.ts          expressions in x: parser, LaTeX, tidy-up and simplifier, exact a + b√s, real roots of polynomials
src/math/derive.ts        derivatives: rules one level at a time, first principles, chain, tangents, stationary points
src/math/applied.ts       applied calculus: areas, volumes of revolution, motion, optimisation, related rates
src/math/mental.ts        mental math: base multiplication, digit-sum check, roots, cubing, magic squares, Major System
src/math/tactics.ts       problem-solving tactics: symmetry, pigeonhole, domino tiling by colouring
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
