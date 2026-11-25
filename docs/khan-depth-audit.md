# Khan Academy depth audit

Issue #670. The gap check behind the Khan plan (#635–#669, tracker #671) compared unit names. This audit goes one level
down: for every Khan Academy unit Zeno already covers, it reads the unit's exercises one by one, as listed on Khan's
course pages on 2026-11-25 (27 courses, from Early math to Linear algebra), and asks three questions of the Zeno skills
that answer the unit:

1. **Kinds**: which kinds of question does Khan ask that the skill does not? (Quoted titles are Khan's exercise names.)
2. **Stage 1, "I get it"**: is there a see-why picture or a hand-worked live piece that shows why, or only a worked
   answer? A piece is named only when its name and menu section plainly teach the skill's idea; "worked answer only
   (picture)" means the worked solution draws a picture but nothing is worked by hand.
3. **Stage 4, "I use it on something new"**: does the skill's hard level ask a question in a new setting (a context the
   learner was not drilled on, or the idea mixed with another)? Judged from the level-3 question templates and, where
   those are bare, from the skill file in `src/math/skills`.

Units no skill answers were the gap check's business and are not repeated; skills built by #635–#669 are counted as
present. Differential equations and Linear algebra have lesson outlines rather than exercise lists, so their gaps are
named by lesson titles. US customary units, US coins and non-maths headings are left out, as in the gap check.

## What it found

Every Khan unit with exercises is answered by at least one Zeno skill, but 964 Khan
exercises ask a kind of question Zeno does not (a few fall in two issues below). Most hard levels are bare calculations with no new setting, and many
skills below calculus have only a worked answer for stage 1. The 139 gaps the five section audits listed are merged
below into 59 follow-up issues, one per skill or group of skills, in school order. Each one lists its Khan
exercises and the audit notes behind it.

The thin spots #670 named are in these issues:

- Volume by counting unit cubes sits in grade 7: #711.
- Geometric random variables: #739.
- Working with units: #705 (and ratio units in #708).
- Only eight skills are made of ideas (concept graph, idea cards, where it breaks): #755.

## Follow-up issues

"Fixes" says which of the three questions above each issue answers: kinds, piece (stage 1), setting (stage 4).

| Issue | Area | Title | Khan exercises | Fixes |
|---|---|---|---|---|
| #697 | Number | Addition and subtraction: stories and more question kinds | 24 | kinds, setting |
| #698 | Number | Place value, rounding and estimates: word form, regrouping, standard form | 23 | kinds, setting |
| #699 | Number | Multiplication and division: meaning, properties and stories | 29 | kinds, setting |
| #700 | Number | Multi-digit × and ÷ by one digit, with estimates | 13 | kinds, setting |
| #701 | Number | Factors, multiples, prime or composite | 7 | kinds |
| #702 | Number | Fractions on the number line, past 1, broken into parts, compared in stories | 18 | kinds, setting |
| #703 | Number | Fraction × whole number, scaling, and × ÷ stories | 19 | kinds, setting |
| #704 | Number | Decimals on grids and number lines, place value and estimates | 22 | kinds, piece, setting |
| #705 | Number | Measuring and time: compare, estimate, choose the unit, convert | 21 | kinds, piece |
| #706 | Number | Negative numbers and rationals: signs, order, stories | 39 | kinds, setting |
| #707 | Number | Percent from pictures and benchmarks, with commission | 10 | kinds, piece, setting |
| #708 | Number | Ratios, rates and proportional relationships | 23 | kinds, setting |
| #709 | Shapes | Area and perimeter: composite shapes, parallelograms, triangles, parts of circles | 27 | kinds, setting |
| #710 | Shapes | Angles and figures: name, measure, draw, solve in x | 15 | kinds, setting |
| #711 | Shapes | Volume and surface area: unit cubes, nets, composite solids, stories | 16 | kinds, setting |
| #712 | Shapes | Coordinate geometry of figures | 14 | kinds, setting |
| #713 | Shapes | Transformations worked backwards, what they keep, and rotational symmetry | 14 | kinds, setting |
| #714 | Shapes | Similarity: scale copies and similar triangles | 13 | kinds, piece |
| #715 | Shapes | Circles: equations from features, arcs and tangents | 15 | kinds, piece |
| #716 | Shapes | Triangle trigonometry: special triangles, identities, sine and cosine rules | 10 | kinds, piece |
| #717 | Shapes | Vectors: magnitude and direction, cross product, lines and planes | 14 | kinds, piece |
| #718 | Algebra | Expressions: write, read and evaluate | 17 | kinds, setting |
| #719 | Algebra | Distributive property, like terms and simple polynomials | 19 | kinds |
| #720 | Algebra | Exponents and roots: meaning, laws, rational exponents, roots of variables | 23 | kinds, piece, setting |
| #721 | Algebra | Linear equations: fractions, number of solutions, find the mistake, stories | 22 | kinds, setting |
| #722 | Algebra | Lines and linear models: every form, tables, rules in two variables, contexts | 32 | kinds, setting |
| #723 | Algebra | Inequalities on a number line: test, graph, read, in words | 10 | kinds, piece |
| #724 | Algebra | Systems: check a pair, count solutions, stories, quadratic systems | 15 | kinds, setting |
| #725 | Algebra | Functions: notation, domain, extrema, composite and inverse | 19 | kinds, setting |
| #726 | Algebra | Graph families: step, piecewise, absolute value, roots, logs, even and odd | 8 | kinds, setting |
| #727 | Algebra | Quadratics by square roots and in stories | 12 | kinds, setting |
| #728 | Algebra | Polynomials: division, the remainder theorem, factoring by structure | 12 | kinds |
| #729 | Algebra | Sequences: recursive and explicit rules | 11 | kinds, setting |
| #730 | Algebra | Exponential and logarithmic models | 13 | kinds, setting |
| #731 | Algebra | Models in words: several variables, combined rates | 10 | kinds, setting |
| #732 | Algebra | Complex numbers and the complex plane | 12 | kinds, piece |
| #733 | Algebra | Sinusoids with a phase shift, built from features and stories | 5 | kinds |
| #734 | Algebra | Matrices: data, transformations of the plane, systems, determinants | 26 | kinds, piece |
| #735 | Data | Building and reading displays: frequency tables, line plots, two-way tables | 22 | kinds, setting |
| #736 | Data | Centre, spread and shape from displays | 28 | kinds, piece, setting |
| #737 | Data | Scatter plots by hand and regression output | 10 | kinds |
| #738 | Data | Probability: rules, sample spaces and counting | 21 | kinds, piece, setting |
| #739 | Data | Random variables: distributions, expected value, binomial and geometric | 22 | kinds, piece, setting |
| #740 | Data | The normal model: z-scores, percentiles, the empirical rule | 10 | kinds, piece, setting |
| #741 | Data | Study design: questions, bias, census, experiments | 10 | kinds |
| #742 | Data | Significance tests: hypotheses, P-values, conclusions, chi-square | 19 | kinds, setting |
| #743 | Data | Confidence intervals and sampling distributions, for one and two proportions | 25 | kinds, setting |
| #744 | Calculus | Limits: techniques, and limits read from a drawn graph | 22 | kinds, setting |
| #745 | Calculus | Derivatives: the definition, differentiability, rules from tables, more families | 22 | kinds |
| #746 | Calculus | The shape of a graph from f′ and f″ | 12 | kinds, piece, setting |
| #747 | Calculus | Related rates | 7 | kinds, piece |
| #748 | Calculus | Definite integrals from pictures and Σ, and the techniques left out | 17 | kinds |
| #749 | Calculus | Areas between curves and volumes of solids | 11 | kinds, setting |
| #750 | Calculus | Parametric, vector and polar calculus | 8 | kinds |
| #751 | Calculus | Series: Σ notation, partial sums, convergence tests, power series | 11 | kinds, piece, setting |
| #752 | Calculus | Differential equations: separable, forcing, Laplace | 19 | kinds, setting |
| #753 | Calculus | Multivariable: setting up integrals, divergence and curl, Hessian and Jacobian, Green | 20 | kinds |
| #754 | Calculus | Subspaces: null and column space, projections, eigenspaces | 15 | kinds |
| #755 | Ideas | More skills made of ideas: concept graph, idea cards, where it breaks | – | ideas |

## Unit by unit

Columns: the Khan unit; the Zeno skills that answer it (L1–L3 are the skill's levels); the kinds of question Khan
asks and Zeno does not; stage 1; stage 4. "same as" points to a unit an earlier course in the same group repeats.

### Early math to grade 4

#### Early math review

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Counting | quickLook, skipCount L1, compare L1, ordinals | counting a still picture at leisure ("Count objects 1/2", "Count in pictures": quickLook only flashes dots); numbers 101–120 ("Numbers to 120": skipCount stays within 100) | piece: tenFrame (Ten frame with counters), hundred (Hundred square to colour) | no (quickLook L3 is just 11–20 dots; skipCount L3 asks "will you say #?", a twist, no context) |
| 2 Addition and subtraction intro | addSubtract L1, kakooma L1, makeTarget L1 | word problems within 10 ("Addition/Subtraction word problems within 10"); all ways to make a small number ("Making small numbers in different ways"); fact families ("Relate addition and subtraction") | piece: tenFrame, rekenrek (Rekenrek), joinSum (Join up) | no (addSubtract L3 is bare three-digit sums) |
| 3 Place value (tens and hundreds) | skipCount L1 (tens and ones), placeValue L1, compare L2 | regrouping ("Regroup whole numbers": 2 hundreds 15 tens = ?); word form ("Write numbers in different forms") | piece: baseTen (Base-ten blocks) | no (placeValue L3 is six digits and decimals, bare) |
| 4 Addition and subtraction within 20 | addSubtract L1, kakooma, rainPlus/runPlus games | three addends ("Add 3 numbers"); true/false equations with an expression on each side ("Equal sign"); stories within 20 incl. more/fewer ("Addition and subtraction word problems 1/2", "Add and subtract within 20 word problems", "Word problems with "more" and "fewer" 2"); arrays as repeated addition ("Adding with arrays", "Array word problems") | piece: rekenrek, tenFrame | no |
| 5 Addition and subtraction within 100 | addSubtract L2 (worked tens then ones), skipCount L2, barModels L1 (difference stories) | more than two addends ("Adding up to four 2-digit numbers"); choosing a strategy ("Select strategies for adding within 100"); stories within 100 incl. 2-step ("Addition/Subtraction word problems within 100", "2-step addition/subtraction word problems within 100", "Add and subtract on the number line word problems"); barModels only covers the compare/difference forms | piece: numberLine (Number line, any range), baseTen, hundred | no for addSubtract (barModels is its own word skill) |
| 6 Addition and subtraction within 1000 | addSubtract L3, columnSums L1, skipCount L3 (hundreds), placeValue L1 | choosing a strategy ("Select strategies for adding within 1000"); four 2-digit addends and their stories ("Adding up to four 2-digit numbers word problems") | piece: baseTen, numberLine | no (columnSums L3 missing digit is a twist, not a context) |
| 7 Measurement and data | measure L1–L2 (ruler, pencil not at 0), time L1, readChart, diagrams L1 (picture graph with a key) | comparing and ordering lengths without numbers ("Compare size", "Order by length", "Indirect measurement"); choosing cm or m ("Units of length (cm, m)", "Measure length in different units"); estimating a length ("Estimate lengths"); line plots ("Make line plots", "Solve problems with line plots": only spread L1 dot plot, grade 7); reading a time off a number line ("Telling time on a number line") | piece: clock (Clock with hands), barChart (Make the bar chart), makeDiagram (Make the diagram); measure: worked answer only (ruler/dial/jug pictures, no hand piece) | yes: measure L3 ribbon/flour/tank stories in two units; time L3 train journeys, 24-hour clock; readChart L3 no |
| 8 Geometry | shapeKinds L1, shadeFraction L1, equivalent L1, shapeArea L1 | relative position ("Relative position"); composing a shape from two others ("Compose shapes", only the tessellate piece); counting right angles in a shape ("Analyze shapes by angles"); is it cut into equal parts? and naming halves/thirds/fourths ("Equal parts of circles/rectangles"); rows × columns of a partitioned rectangle ("Partitioning rectangles") | piece: shapeSort (Sort the shapes), geoboard, tessellate (Tile it), fractions (Fractions to shade) | no (shapeKinds L3 always/sometimes/never is reasoning, no new setting) |

#### Kindergarten math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Counting and place value | same as Early math unit 1 (plus "Teen numbers" = Early math unit 3) | as there | as there | as there |
| 2 Addition and subtraction | same as Early math unit 2 | as there | as there | as there |
| 3 Measurement and geometry | same as Early math units 7 ("Compare size", "Compare length") and 8 (shapes, relative position, compose) | as there | as there | as there |

#### 1st grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Place value | same as Early math units 1 and 3 (numbers to 120, tens and ones, compare 2-digit) | as there | as there | as there |
| 2 Addition and subtraction | same as Early math units 2, 4 and 5 (relate, within 20, 3 numbers, equal sign, stories, add 1 or 10, four 2-digit numbers) | as there | as there | as there |
| 3 Measurement, data, and geometry | same as Early math units 7 and 8; adds "Fourths" (shadeFraction covers it) | as there | as there | as there |

#### 2nd grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Add and subtract within 20 | same as Early math unit 4 | as there | as there | as there |
| 2 Place value | placeValue L1, compare L2, skipCount L2–L3 (odd/even, 5s, 10s, 100s) | largest number from given digits ("Create the largest number"); word form ("Write numbers in number and word form", "Write numbers in word and expanded form"); regrouping ("Regroup whole numbers") | piece: baseTen, hundred, numberShapes (Number patterns as dots) for odd/even | no |
| 3 Add and subtract within 100 | same as Early math unit 5 | as there | as there | as there |
| 4 Add and subtract within 1,000 | same as Early math unit 6 | as there | as there | as there |
| 5 Money and time | time L1 (clock), money L1 (cents and dollars, US coins left out) | as Early math unit 7 (time on a number line) | piece: clock | yes: time L3 journeys; money L3 change from a note |
| 6 Measurement | same as Early math unit 7 (length part) | as there | as there | as there |
| 7 Data | same as Early math unit 7 (graphs part) | as there | as there | as there |
| 8 Geometry | same as Early math unit 8 | as there | as there | as there |

#### 3rd grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Intro to multiplication | tables L1 (worked as an array), skipCount | equal groups and repeated addition as an expression ("Equal groups", "Understand equal groups as multiplication", "Relate repeated addition to multiplication", "Multiply using groups of objects"); jumps on a line ("Represent multiplication on the number line"); stories ("Multiplication in contexts"); turn-round fact as a question ("Commutative property of multiplication" and its two variants) | piece: dots (Dot multiplication), cubes (Linking cubes) | no (tables L3 is 11, 12, missing factor, 40 × 60, bare) |
| 2 1-digit multiplication | tables L1–L2, rainTimes/runTimes/joinProduct games | splitting a fact ("Visualize distributive property", "Distributive property": 7 × 8 = 7 × 5 + 7 × 3) | piece: dots, areaBlocks (Multiplying with blocks: the area model) | no |
| 3 Addition, subtraction, and estimation | closerTo L1/L3, rounding L1, addSubtract L3, columnSums L1, estimateLine L2 | rounding three-digit numbers to 10 or 100 (rounding L1 uses 4–5 digits); estimate first, then add/subtract ("Estimate to add/subtract multi-digit whole numbers"); strategy choice ("Select strategies for subtracting within 1000"); stories ("Add and subtract within 1000 word problems") | piece: numberLine; rounding: worked answer only (number-line zoom picture) | yes: closerTo L3 estimates a sum/product against round numbers (idea mixed with rounding) |
| 4 Intro to division | divide L1–L2, tables L2 (missing factor) | sharing/grouping stories ("Division in contexts", "Relate division to multiplication word problems"); fact families ("Fact families", "Relate multiplication and division equations"); groups/arrays as division ("Division with groups of objects", "Division with arrays") | piece: dots (arrays); the division piece is long division only | no (divide L3 remainders and 2400 ÷ 60, bare; stories only in longDivide, grade 5) |
| 5 Understand fractions | shadeFraction, equivalent L1, makeWhole, orderFractions, estimateLine L3 (fractions on 0–1) | reading a marked point on a line as a fraction ("Unit fractions on the number line", "Fractions on the number line", "Relate number lines to fraction bars"); fractions past 1 on a line or a picture ("Recognize fractions greater than 1", "Fractions greater than 1 on the number line"); "Find 1 on the number line"; "Write whole numbers as fractions", "Relate fractions to 1"; are the parts equal? ("Cut shapes into equal parts"); "Fractions in contexts" | piece: fractions (Fractions to shade), fracOrder (Fractions on the line), frogJumps, findWhole (Find the whole), overflowBars | no |
| 6 Equivalent fractions and comparing fractions | compareFractions L1–L2, equivalent L2, orderFractions | "Fractions of different wholes" (half of a big vs half of a small pizza); "Equivalent fractions on the number line" | piece: compareFractions (Comparing fractions), foldStrip (Fold to equal), equivMatch | no (compareFractions L3 bare signs) |
| 7 More with multiplication and division | tables L2–L3 (missing factor, multiples of ten), divide L2 (missing number) | grouping three factors ("Understand associative property of multiplication", "Associative property of multiplication", "Use associative property to multiply 2-digit numbers by 1-digit"); stories ("Multiplication and division word problems (within 100)", "Multiply by tens word problems") | piece: areaBlocks, dots | no |
| 8 Arithmetic patterns and problem solving | barModels L1–L2, findRule, growingPattern, skipCount L3 (sum odd/even), order (grade 7) | writing the equation with a letter for a story ("Represent 2-step word problems with equations"); estimation stories ("2-step estimation word problems"); patterns in the times table and hundreds chart ("Patterns in multiplication tables", "Patterns in hundreds chart") | piece: hundred, growing (Growing patterns), machine (Guess my rule), whichWord / cruxWord | yes: barModels L3 leftover-and-shortage, gift makes two amounts equal |
| 9 Quadrilaterals | shapeKinds L3 | nothing found missing | piece: shapeSort (two rings) | no (always/sometimes/never only) |
| 10 Area | shapeArea L1, areaPerimeter L1–L2 (rectangle area, side from area) | comparing two areas ("Compare area with unit squares", "Compare areas by multiplying"); partial arrays ("Area of rectangles with partial arrays"); area split into two rectangles ("Represent/Solve area with the distributive property"); L-shaped figures ("Understand decomposing figures to find area", "Decompose figures to find area") | piece: geoboard (Geoboard: shapes and area), areaBlocks, geoLab | yes: shapeArea L3 mixes area with perimeter (make a shape with both) |
| 11 Perimeter | areaPerimeter L1–L2, shapeArea L3 | perimeter of a non-rectangle from its sides ("Find perimeter when given side lengths", "Find perimeter when a side length is missing"); stories ("Perimeter word problems", "Area and perimeter word problems"); area or perimeter? ("Area and perimeter situations"); "Compare area and perimeter" | piece: geoboard, geoLab | partly: shapeArea L3 (area with perimeter); areaPerimeter L3 is circles, no context |
| 12 Time | time L1–L2 | reading to the minute ("Tell time to the nearest minute": time L1 is to 5 min); reading a time off a number line ("Tell time on the number line", "Time word problems with number line"; the line appears only in worked answers) | piece: clock | yes: time L3 timetables, 24-hour clock |
| 13 Measurement | measure L1 (dial in g, jug in ml), L3 | estimating ("Estimate mass (grams and kilograms)", "Estimate volume (milliliters and liters)"); stories with × or ÷ ("Word problems with mass", "Word problems with volume": measure L3 only adds/takes away) | worked answer only | yes: flour/rice/juice stories in two units |
| 14 Represent and interpret data | diagrams L1 (picture graph, key 2/5/10), readChart L1–L3, barChart/makeDiagram games | two-step graph questions ("Read picture graphs (multi-step problems)", "Read bar graphs (2-step problems)"); line plots with fractions ("Graph data on line plots", "Read line plots (data with fractions)", "Measure lengths to nearest 1/4 unit") | piece: barChart, makeDiagram | no (readChart L3 "altogether" is one step) |

#### 4th grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Place value | placeValue L2–L3 (4–6 digits, × ÷ 10/100/1000), compare L2 | comparing 4+ digit numbers (compare L2 stops at three digits) and across forms ("Compare multi-digit numbers", "Compare multi-digit numbers written in different forms"); largest/smallest from digits ("Creating largest or smallest number"); word form ("Write numbers in written form", "Write whole numbers in different forms"); "Regroup whole numbers" | piece: baseTen, soroban | no |
| 2 Addition, subtraction, and estimation | rounding L1, columnSums L2–L3 | "Round whole numbers word problems" | piece: baseTen; rounding worked answer only | no |
| 3 Multiply by 1-digit numbers | times L1 (2-digit × 1-digit, area-model answer), tables L3, placeValue L2 (× 10/100/1000), barModels L2 ("k times as much") | 3- and 4-digit × 1-digit ("Multiply 3- and 4-digits by 1-digit with area models / with distributive property"; times L3 is 3-digit × 2-digit); estimating products ("Estimate products (1-digit times 2, 3, and 4-digit)"; only closerTo L3 near it); "Compare with multiplication" as a bare statement (8 is 4 times as many as 2) | piece: areaBlocks | no (times has one prompt, "Work out", at every level) |
| 4 Multiply by 2-digit numbers | times L2, tables L3 | "Estimate products (2-digit numbers)" | piece: areaBlocks | no |
| 5 Division | divide L3, longDivide L1–L3 | 3- and 4-digit ÷ 1-digit with remainders ("Divide multi-digit numbers by 2, 3, 4, and 5 / 6, 7, 8, and 9 (remainders)"; divide L3 quotients stop at 29, longDivide uses 2-digit divisors); area-model division ("Create division equations with area models", "Divide by 1-digit numbers with area models"); estimating quotients ("Estimate to divide by 1-digit numbers", "Estimate quotients"); "Represent multi-step word problems using equations" | piece: division (Long division, step by step) | yes: longDivide L3 eggs in boxes, coaches (interpret remainders) |
| 6 Factors, multiples and patterns | divisibility, hcf, primes (grade 7), findRule, growingPattern, shapePatterns | listing factor pairs ("Factor pairs", "Identify factors"); multiples ("Identify multiples", "Relate factors and multiples"); prime or composite as a question ("Identify prime numbers", "Identify composite numbers", "Prime and composite numbers": only the primeSlice game) | piece: primeSlice (Prime slice), divisible (Divisible by?), dots | no (divisibility L3 just more divisors) |
| 7 Equivalent fractions and comparing fractions | equivalent, compareFractions L2–L3 (half benchmark, unlike bottoms), fractions (lowest common denominator), closerTo L2 (0, ½, 1) | "Compare fractions word problems"; "Fractions of different wholes" (as 3rd grade unit 6) | piece: compareFractions, foldStrip, equivMatch | no |
| 8 Add and subtract fractions | fractionSums L1–L2 (like and unlike bottoms, mixed numbers), makeWhole, fractions (grade 6) | splitting a fraction into a sum ("Decompose fractions visually", "Decompose fractions"); add/subtract stories ("Add and subtract fractions word problems (same denominator)", "Add and subtract mixed numbers word problems (like denominators)": fractionSums L3 stories are sharing, not adding); line plots of fractional data ("Graph data on line plots (through 1/8 of a unit)", "Interpret line plots", "Interpret line plots with fraction addition and subtraction") | piece: stripes (Stripes: multiply, add, between), fractionWall (Make a whole), overflowBars | yes but off-idea: fractionSums L3 cake/pizza/rice stories are division |
| 9 Multiply fractions | fractionSums L2 ("#/# of #", whole-number answers) | whole number × fraction with a fraction answer ("Multiply unit fractions and whole numbers", "Multiply fractions and whole numbers", "... with fraction models", "... on the number line", "Equivalent whole number and fraction multiplication expressions"); "Multiply mixed numbers and whole numbers"; stories ("Multiply fractions and whole numbers word problems", "Interpret multiplying fraction and whole number word problems") | piece: stripes, shareBags (Share the bag) | no |
| 10 Understand decimals | convert L1 (tenths, hundredths ↔ decimals), compare L3 (0.5 vs 0.45), placeValue L3, estimateLine L3, equivalent L3 | reading a decimal off a shaded grid or a marked line ("Write decimals and fractions shown on grids / number lines", the "greater than 1" pair, "Decimals on the number line: tenths / hundredths" four exercises); decimals in words ("Decimals in words", "Relate decimals and fractions in words"); "Decimal place value with regrouping"; comparing a decimal with a fraction ("Compare decimals and fractions in different forms", "Compare decimals visually") | piece: numberLine; no decimal-grid piece in the list | yes, weakly: decimals L3 (a separate skill) writes metric units as decimals |
| 11 Plane figures | shapeKinds L2 (line/ray/segment, angle kind, parallel/perpendicular, triangle by sides, by angles), symmetryLines | three-letter angle names ("Name angles"); counting angles in a figure ("Recognize angles in figures"); both names at once ("Classify triangles by both sides and angles", "Classify shapes by line and angle types"); drawing ("Draw parallel and perpendicular lines") | piece: geoLab, mirror (Lines of symmetry: fold the shape), shapeSort | no |
| 12 Measuring angles | estimateAngle, missingAngle L1 (angles on a line, in a right angle), parallelAngles L1 | reading a protractor exactly ("Measure angles") and drawing an angle of a size ("Draw angles"); angle as a fraction of a turn ("Angles in circles", "Benchmark angles") | piece: angleGuess (Guess the angle), angleHunt (Missing angles) | yes: missingAngle L3 mixes angle sums with isosceles triangles and quadrilaterals |
| 13 Area and perimeter | same as 3rd grade units 10–11 (adds "Represent rectangle measurements", "Area & perimeter of rectangles word problems") | as there | as there | as there |
| 14 Units of measurement | measure L2 (m/cm, kg/g, l/ml, km/m), decimals L3, time L2–L3, money L1 | estimating ("Estimating length (mm, cm, m, km)", "Estimating time (seconds, minutes, and hours)", mass/volume as 3rd grade); mm ("Convert to smaller units (mm, cm, m, & km)"); seconds/minutes/hours ("Convert to smaller units (sec, min, & hr)", "Time conversion word problems"); conversion stories with × ("Metric conversions word problems") | worked answer only (measure); piece: clock (time) | yes: measure L3 two-unit stories; time L3 timetables |

Not covered: "Relative position" (above, below, beside; Early math 8, Kindergarten 3) has no Zeno skill or piece.

### Grades 5 to 8 and Arithmetic

#### 5th grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Decimal place value | placeValue, compare (L3), rounding (L1), estimateLine (L3) | decimals in written words; regrouping (0.3 + 0.05 as hundredths); ordering a list of decimals; compare/round word problems | worked answer only (no decimal blocks or grid piece) | yes: rounding L3 bounds of a measured length |
| 2 Add decimals | decimals (L1), convert (L1) | estimate the sum first; add on a grid; tenths + whole number as its own form | worked answer only (columns picture) | no: decimals L3 is unit conversion and whole ÷ whole |
| 3 Subtract decimals | decimals (L1) | estimate the difference first; subtract on a grid | worked answer only (columns picture) | no |
| 4 Add and subtract fractions | fractionSums, fractions, makeWhole, closerTo (L2) | estimate the sum against benchmarks; "equivalent expressions with common denominators"; ± word problems with unlike denominators | piece: Stripes (add); Make a whole: fraction tiles | no: the fractionSums L3 stories share and divide, they do not add or subtract |
| 5 Multi-digit multiplication and division | times, longDivide, divide, tables (L3), rounding (L2 estimate) | estimate a quotient (only products are estimated) | piece: Multiplying with blocks (area model); Long division, step by step | yes: longDivide L3 coaches, egg boxes |
| 6 Multiply fractions | fractions (×, mixed), fractionSums (L2 fraction of a number) | scaling (bigger or smaller than the whole number, without working it out); area of a rectangle with fraction sides; × word problems | piece: Stripes (multiply); Share the bag | no: fractions L3 is bare |
| 7 Divide fractions | fractionSums (L1, L3), fractions | relating ÷ to × (1/3 ÷ 4 = 1/3 × 1/4); choosing the story that fits a division | piece: How many fit? (laying tiles) | yes: cake shared, rice servings, pizzas |
| 8 Multiply decimals | decimalTimes, decimals (L2) | none found | worked answer only (hundred grid) | yes: decimalTimes L3 more-or-less judgement |
| 9 Divide decimals | decimals (L2, L3), decimalTimes (L3) | estimate a quotient | worked answer only | yes: ribbon cut into pieces, jug poured into glasses |
| 10 Powers of ten | decimals (L2), placeValue (L2), decimalTimes (L3 10³) | comparing place values (a digit's value is 10 times the same digit's value one place to the right) | worked answer only (shift picture) | no |
| 11 Volume | volume (L1 cuboid), shapeKinds (L1) | counting and comparing unit-cube solids; L-shaped (decomposed) prisms; volume word problems | piece: Solids: turn, unfold, slice, fill (fill with unit cubes) | no: L3 finds r or h from V, bare |
| 12 Coordinate plane | coordinates (L1, quadrant 1) | horizontal/vertical distance between points; quadrant-1 word problems | piece: Plot the point | yes: fourth corner of a rectangle |
| 13 Algebraic thinking | order, findRule, growingPattern, sequences | writing an expression from words ("add 3, then times 5"); table and graph of a two-variable rule; two patterns compared | piece: Guess my rule: the function machine; Growing patterns | no: findRule L3 runs the machine backwards, bare |
| 14 Converting units of measure | decimals (L3), measure (L2, L3), time | converting units of time (h to min, days to h) | worked answer only | yes: measure L3 flour, rope, tank in mixed units |
| 15 Line plots | spread (L1 dot plot), diagrams (L3) | line plots in fractions of a unit; adding or subtracting fraction data read from the plot | worked answer only | no |
| 16 Properties of shapes | shapeKinds (L2, L3) | none found | piece: Sort the shapes: two rings | yes: always/sometimes/never claims about shape families |

#### 6th grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Ratios | ratio, rate, proportion (L2 table) | ratio tables to fill in; ratios on a coordinate plane; ratios with units of measurement; real-world equivalent-ratio stories | piece: Double number line | no: ratio L3 is only sweets shared |
| 2 Arithmetic with rational numbers | decimals, decimalTimes, fractions (÷), fractionSums, longDivide | ± to thousandths; ± decimal word problems; choosing the story for a fraction division; ÷ word problems beyond unit fractions | piece: How many fit?; Long division, step by step | yes: decimalTimes L3 ribbon and jug (fractions L3 is bare) |
| 3 Rates and percentages | rate, percent, convert, moneySense | percent from a 10×10 grid or a fraction model; "what percent of b is a"; the whole from a part and its percent; benchmark percents | worked answer only (percent bars) | yes: rate L3 meeting and catch-up (percent L3 is bare) |
| 4 Exponents and order of operations | squares, order | powers past squares and cubes (2⁵, 3⁴); order of operations with fractions, decimals and exponents (order uses whole numbers only) | worked answer only | no |
| 5 Negative numbers | compare (L3), estimateLine (L3), absoluteValue (L1), integers (L2) | negative decimals and fractions on the line; ordering a list of rationals; writing an inequality from a statement; reading negatives and absolute value in contexts (debt, elevation) | piece: Number line, any range; Both ways from a: \|x − a\| | no |
| 6 Variables & expressions | sameExpression, formulae (L1 substitution), hcf | naming an expression's parts (term, coefficient); evaluating with fractions, decimals or exponents; writing expressions from words; factoring out a GCF (4(9 + 2), 3(2x + 5)) | piece: Algebra tiles; Equal expressions: match the cards | no: sameExpression L3 is bare |
| 7 Equations & inequalities | balance, linear (L1 is already two-step), inequalities, readFunction (L1 table) | one-step equations; testing a solution; fraction/decimal coefficients; modelling a story with an equation; graphing and reading an inequality on a number line; a table from y = 3x; independent vs dependent | piece: Balance the scales | yes: inequalities L3 lift load (linear L3 is bare) |
| 8 Plane figures | areaPerimeter (L2), shapeArea | parallelogram area; a missing base or height from the area; composite shapes cut into triangles | piece: Geoboard: shapes and area; Geometry lab | no: areaPerimeter L3 is circles, bare |
| 9 Coordinate plane | coordinates (L2, L3) | horizontal/vertical distance; drawing a polygon from its vertices; its area and perimeter on the grid | piece: Plot the point; Geometry lab | yes: fourth corner of a rectangle |
| 10 3D figures | volume, shapeKinds (L1), cubeNets | volume with fractional edges; prism and pyramid nets to surface area (practice has the surface area of cylinders, cones and spheres only); surface-area word problems | piece: Solids: turn, unfold, slice, fill; Cube nets | no: volume L3 is bare |
| 11 Data and statistics | average, spread, diagrams | statistical questions; frequency tables; a missing value from the mean; the centre from a dot plot; shape, clusters, gaps and peaks; choosing a display | piece: Split the row (box plot) | yes: spread L3 two classes' box plots, the effect of a changed value |
| 12 Khan for families | n/a (no exercises) | none | none | none |

#### 7th grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Proportional relationships | proportion, rate, ratio | whether a table or graph is proportional; k from the point (1, r); the meaning of k in a context; writing y = kx from a table or story; comparing two constants | piece: Double number line; Graph with sliders | yes: proportion L3 y ∝ x², x³, √x |
| 2 Rates and percentages | rate, percent, moneySense, convert, realNumbers (L2) | unit rates with fractions (½ mile in ¼ hour); ordering mixed rationals; commission | piece: Two changes in a row | yes: moneySense L3 loans, best value, tax bands |
| 3 Integers: addition and subtraction | integers (L1, L2) | the sign of a sum without working it out; the missing number (−3 + ? = 5); the equation a number-line diagram shows; substitution; one-step equations with negatives | piece: Integer counters; Minus turns it round | no: integers L3 is × ÷ |
| 4 Rational numbers: addition and subtraction | integers, absoluteValue (L1), fractions | ± negative fractions and decimals; word problems (statements, gains and losses); regrouping by the commutative and associative properties | piece: Number line, any range; Both ways from a | no |
| 5 Negative numbers: multiplication and division | integers (L3) | × ÷ negative fractions; the sign of a product; powers of negatives ((−2)³, (−½)²); order of operations with negatives; word problems | piece: Minus times minus: follow the pattern | no |
| 6 Expressions, equations, & inequalities | sameExpression, linear, inequalities, balance | distribution with negative or rational coefficients; reading a linear expression in context; writing expressions from stories; two-step equations with fractions/decimals; finding the mistake; plotting an inequality | piece: Balance the scales; Algebra tiles | yes: inequalities L3 lift (linear L3 is bare) |
| 7 Statistics and probability | probability, sampling, spread, counting (grade 12) | experimental probability from data; comparing probabilities; predicting counts; probability models; the counting principle; valid claims | piece: Chance experiment; Dice to roll; Spinner to spin | yes: probability L3 two draws without replacement; sampling L3 study design |
| 8 Scale copies | scale, similarity, transformations (L3) | whether a figure is a scale copy; corresponding sides and points; the scale factor read from a drawing | piece: The plan and the floor; Move the shape | yes: scale L3 areas on plans, a plan redrawn at a new scale |
| 9 Geometry | areaPerimeter (L3), arcs, parallelAngles, missingAngle, triangleInequality, crossSections (L1), volume | wheel rotations; semicircle and quarter-circle perimeters; shaded composite areas; angle equations in x without parallel lines; volume and surface-area stories | piece: Geometry lab; Parallel lines; Missing angles; Build the triangle; Solids | yes: parallelAngles L3 find x; triangleInequality L3 isosceles perimeter (the skill has no grades set) |

#### 8th grade math

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Numbers and operations | realNumbers, squares, indices, rounding (L2 standard form) | a fraction written as a recurring decimal; x² = k and x³ = k; powers of powers and of products; standard-form stories; approximating with powers of 10 | piece: Squeeze the root | yes: realNumbers L3 rational/irrational sums and products |
| 2 Solving equations with one unknown | linear (L2, L3) | fraction/decimal coefficients; number of solutions (none or infinitely many); consecutive-integer sums | piece: Balance the scales | no |
| 3 Linear equations and functions | slope, line, readFunction, graphStory, proportion | slope from an equation; graphing from y = mx + b; whether a point solves a two-variable equation; function or not from a table or graph; writing a linear function from a story | piece: Draw the gradient; Graph with sliders; Graph stories | yes: readFunction L3 phone plans |
| 4 Systems of equations | simultaneous | solving by graphing; number of solutions; testing a solution; age and other word problems | worked answer only (the two lines drawn) | no |
| 5 Geometry | parallelAngles, missingAngle, pythagoras, distance, volume | angle equations from angle addition; Pythagoras to a perimeter or area; cylinder, cone and sphere word problems | piece: Discover Pythagoras; Parallel lines; Solids | yes: pythagoras L3 ladder, box diagonal |
| 6 Geometric transformations | transformations, congruence, similarity | properties a rigid move or a dilation keeps; a sequence of moves taking one shape onto another (transformations L2 asks for one move) | piece: Move the shape | yes: transformations L3 two moves in a row |
| 7 Data and modeling | scatter, twoWay | constructing a scatter plot; estimating the line's slope and equation from the points | piece: Squares on the residuals; Out of what? Shares in a two-way table | yes: scatter L3 causation stories; twoWay L3 association |

#### Arithmetic

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Intro to multiplication | tables (L1) | equal groups, number-line jumps and arrays to read; the commutative property | piece: Linking cubes (trains of equal length) | no |
| 2 1-digit multiplication | tables, barModels (L2 "times as much") | the distributive and associative properties (shown, then used for 2-digit × 1-digit) | piece: Number rain / Gate run (× facts); Multiplying with blocks | no: tables L3 is bare |
| 3 Intro to division | divide (L1, L2) | relating division and multiplication equations (fact families); word problems within 100 | piece: Linking cubes; Long division, step by step (blocks) | no |
| 4 Understand fractions | shadeFraction, equivalent, compareFractions, estimateLine (L3), orderFractions | fractions above 1 and whole numbers as fractions on a number line; finding 1 from a marked fraction | piece: Fractions to shade; Fold to equal; Find the whole; Overflow bars | no |
| 5 Place value through 1,000,000 | placeValue | none found | piece: Base-ten blocks | no |
| 6 Add and subtract through 1,000,000 | addSubtract, columnSums | none found | piece: Base-ten blocks; Hundred square to colour | no |
| 7 Multiply 1- and 2-digit numbers | times, tables (L3) | writing the partial products by the distributive property | piece: Multiplying with blocks (area model) | no |
| 8 Divide with remainders | divide (L3), longDivide, barModels | none found | piece: Long division, step by step | yes: longDivide L3 remainder stories; barModels L3 |
| 9 Add and subtract fractions (like denominators) | fractionSums (L1), fractions, makeWhole | breaking a fraction into a sum (3/5 = 1/5 + 2/5) | piece: Make a whole: fraction tiles; Overflow bars | no |
| 10 Multiply fractions | as 5th unit 6 | same as 5th grade unit 6, plus fraction × whole number on a number line | as 5th unit 6 | as 5th unit 6 |
| 11 Decimals and place value | as 5th unit 1 | same as 5th grade unit 1, plus decimals and fractions read off grids and number lines | as 5th unit 1 | as 5th unit 1 |
| 12 Add and subtract decimals | as 5th units 2–3 | same as 5th grade units 2–3 | as 5th units 2–3 | as 5th units 2–3 |
| 13 Add and subtract fractions (different denominators) | as 5th unit 4 | same as 5th grade unit 4 (with denominators 10 and 100 first) | as 5th unit 4 | as 5th unit 4 |
| 14 Multiply and divide multi-digit numbers | as 5th unit 5 | same as 5th grade unit 5 | as 5th unit 5 | as 5th unit 5 |
| 15 Divide fractions | as 5th unit 7, 6th unit 2 | same as 5th grade unit 7 and 6th grade unit 2 | as 5th unit 7 | as 5th unit 7 |
| 16 Multiply and divide decimals | as 5th units 8–9 | same as 5th grade units 8–9 | as 5th units 8–9 | as 5th units 8–9 |
| 17 Exponents and powers of ten | as 5th unit 10, 6th unit 4 | same as 5th grade unit 10 and 6th grade unit 4 | as those units | as those units |
| 18 Add and subtract negative numbers | as 7th unit 3, 6th unit 5 | same as 7th grade unit 3 and 6th grade unit 5 | as 7th unit 3 | as 7th unit 3 |
| 19 Multiply and divide negative numbers | as 7th unit 5 | same as 7th grade unit 5 | as 7th unit 5 | as 7th unit 5 |

Not covered: none. Some Zeno skill answers every unit in these five courses. (6th grade unit 12 has no exercises.)

### Pre-algebra to Algebra 2

#### Pre-algebra

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Factors and multiples | divisibility, hcf, primes | factor pairs; list/identify multiples; relate factors and multiples; "is it prime / composite?" as a practice question (only the Prime slice game) | piece: Prime slice; Divisible by? | no |
| 2 Patterns | shapePatterns, growingPattern, findRule, order | translate/create expressions with parentheses from words; tables and graphs from a rule in 2 variables; relationships between 2 patterns | piece: Growing patterns; Guess my rule | no |
| 3 Ratios and rates | ratio, rate, moneySense (better value) | ratio tables; ratios on the coordinate plane; ratios with units of measurement; tape-diagram ratio questions | piece: Double number line | yes: two vehicles meet / catch up (rate) |
| 4 Percentages | percent, convert | percents from fraction models / grids; find percents visually; benchmark percents; equivalent representations | worked answer only (percent bars) | no |
| 5 Exponents intro and order of operations | squares, indices, order | order of operations with fractions; powers of decimals beyond 0.n² | worked answer only (array for squares) | no |
| 6 Variables & expressions | sameExpression, formulae (substitute), expand | parts of an expression (term, coefficient); evaluating a written expression at a value (only formula substitution); expression value intuition; writing expressions from words; factoring a linear expression (6x + 9 = 3(2x + 3)); rational coefficients | piece: Algebra tiles; Equal expressions | no |
| 7 Equations & inequalities introduction | balance, linear, inequalities | testing a value in an equation/inequality; tape-diagram equations; one-step equations with fractions & decimals; find the mistake; model/translate a one-step equation from words; graph an inequality on a number line and read one from a graph; independent vs dependent variable; tables from 2-variable equations | piece: Balance the scales (hanger) | inequalities only: yes, lift load; linear: no |
| 8 Percent & rational number word problems | moneySense, percent, integers, decimalTimes | commission; percent problems written as equivalent expressions (1.15x); rational-number word problems with negatives/fractions at L3 | piece: Two changes in a row | yes: loans, best value, tax bands (moneySense) |
| 9 Proportional relationships | proportion, rate, ratio | is it proportional? (table, graph, equation); interpret the constant / point (1, k); compare constants; write y = kx from a table or context; unit rates with fractions | piece: Double number line | partly: y ∝ x², x³, √x (mixed idea), no new context |
| 10 One-step and two-step equations & inequalities | linear, inequalities, sameExpression | rational coefficients in equations and like terms; two-step word problems (write, interpret); find the mistake; testing solutions | piece: Balance the scales | inequalities: yes, lift load; linear: no |
| 11 Roots, exponents, & scientific notation | squares, indices, rounding (standard form), realNumbers | x² = k and x³ = k equations; roots of decimals; powers of products & quotients; dividing in standard form; approximating with powers of 10; scientific-notation word problems | piece: Squeeze the root | no |
| 12 Multi-step equations | linear | decimals & fractions; number of solutions (none / infinitely many); sums of consecutive integers | piece: Balance the scales | no |
| 13 Two-variable equations | coordinates, slope, line, readFunction, regions (L2 slope of ax + y = c) | is (a, b) a solution / complete the pair; intercepts from an equation; slope-intercept equation read off a graph; graph from y = mx + c | piece: Draw the gradient; Plot the point; Graph with sliders | partly: perpendicular line (mixed), no context |
| 14 Functions and linear models | readFunction, findRule, graphStory | recognise functions from tables and graphs (only a mapping diagram); write and interpret linear models from words; graphing linear word problems | piece: Guess my rule; Graph stories; Graph with sliders | yes: phone plans compared (readFunction) |
| 15 Systems of equations | simultaneous, balance (L3 two shapes) | is (a, b) a solution; solve by graphing; substitution-shaped systems (y = …) | piece: Balance the scales (two shapes) | no |

#### Algebra basics

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Foundations | integers, absoluteValue, squares, surds, order, fractions, convert, percent, decimals, areaPerimeter | signed fractions (+, −, ×, ÷ with negatives); order of operations with negative numbers; simplify square roots with variables; area of a triangle as a formula question; rest same as Pre-algebra units 4, 5, 11 | piece: Integer counters; Minus turns it round; Both ways from a; Squeeze the root | integers L2 has temperatures, L3 bare: no |
| 2 Algebraic expressions | sameExpression, expand, stackedFractions (nested fractions) | same as Pre-algebra unit 6 and 10 | piece: Algebra tiles; Equal expressions | no |
| 3 Linear equations and inequalities | linear, inequalities, proportion | same as Pre-algebra units 10, 12; "Solving proportions 2" (x in a fraction both sides) | piece: Balance the scales | inequalities: yes, lift load; linear: no |
| 4 Graphing lines and slope | coordinates, slope, line, regions | horizontal & vertical lines; rest same as Pre-algebra unit 13 | piece: Draw the gradient; Plot the point; Test the points | partly: perpendicular line (mixed) |
| 5 Systems of equations | simultaneous | number of solutions graphically and algebraically; rest same as Pre-algebra unit 15 | piece: Balance the scales (two shapes) | no |
| 6 Expressions with exponents | indices, rounding (standard form) | exponent laws with variables (x³·x⁵, (x²)⁴, (xy)³, x⁻²); dividing in standard form; standard-form word problems | worked answer only | no |
| 7 Quadratics and polynomials | expand, factor, quadratic | add & subtract polynomials; monomial × polynomial (k(x + a), 3x(x² − 2)) | piece: Algebra tiles; Multiplying with blocks | no |
| 8 Equations and geometry | parallelAngles, missingAngle, pythagoras, similarity | equations from segment addition and midpoints; "are these triangles similar?" by angles / SSS; similar right triangles | piece: Parallel lines; Discover Pythagoras; Build the triangle | yes: ladder, box diagonal (pythagoras); similar solids' volumes |

#### Algebra 1

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Algebra foundations | sameExpression, formulae (substitute) | same as Pre-algebra unit 6 and 10 | piece: Algebra tiles; Equal expressions | no |
| 2 Solving equations & inequalities | linear, inequalities, formulae | reasoning with linear equations; linear equations with unknown coefficients (ax + b = c for x); compound "or" inequalities; rest same as Pre-algebra unit 12 | piece: Balance the scales | inequalities: yes, lift load (L3 also compound "and"); linear: no |
| 3 Working with units | rate, crossSections (density), currency | rate conversion (km/h ↔ m/s, unit chains); defining quantities for a model; formulas and units | worked answer only | yes: meet / catch-up (rate); density (crossSections) |
| 4 Linear equations & graphs | slope, line, readFunction | slope and intercepts from a table; intercepts from an equation; horizontal & vertical lines; relate a context to slope / intercept; linear word problems from tables and graphs; rest same as Pre-algebra unit 13 | piece: Draw the gradient; Graph with sliders | yes: phone plans (readFunction); slope, line: no context |
| 5 Forms of linear equations | line, regions (L2 slope of standard form, point-slope pick) | point-slope form written; graph from standard form; convert to standard form; linear equations in any form; writing linear equations from words | piece: Graph with sliders | partly: perpendicular line (mixed), no context |
| 6 Systems of equations | simultaneous, balance | is (a, b) a solution; graphing; elimination strategy questions; number of solutions; creating systems in context; points relative to a system; age and other word problems (incl. 0 and ∞ solutions) | piece: Balance the scales (two shapes) | no |
| 7 Inequalities (systems & graphs) | regions | little missing: systems-of-inequalities word problems give one inequality, not two | piece: Test the points | yes: wood for chairs and shelves, eggs for cakes and pies |
| 8 Functions | readFunction, functions, rationalFn (domain), graphStory | evaluate function expressions (f(2a), f(x) + g(x)); function notation word problems; domain from a formula and from context; relative and absolute max/min from a graph; positive/negative intervals of a general graph; recognise functions from tables/graphs; inverse of a linear function as a formula (Zeno asks only f⁻¹(a)) | piece: Chords on a curve; Guess my rule; Graph stories | yes: phone plans (readFunction) |
| 9 Sequences | sequences, series | recursive formulas; explicit formulas written; convert recursive ↔ explicit; geometric with fractional ratio; sequences word problems; sequences and domain | piece: Growing patterns | no (L3 is a quadratic rule, bare) |
| 10 Absolute value & piecewise functions | absoluteValue, fnTransform | step functions; graph a piecewise function; graph / scale / reflect y = a\|x − h\| + k as a graph question | piece: Both ways from a; Move the graph | no |
| 11 Exponents & radicals | indices, squares, surds | exponent laws with variables; simplify square roots with variables; products of roots (√a·√b); roots of decimals | piece: Squeeze the root | no |
| 12 Exponential growth & decay | exponential | interpret the parts of an exponential expression; match exponential graphs to contexts; linear vs exponential over time from a graph; write a decay function | piece: The growth race | yes: monthly vs yearly rate, continuous compounding, years to a target |
| 13 Quadratics: Multiplying & factoring | expand, factor | polynomials intro (terms, degree); monomial × polynomial; GCF factoring of a linear or monomial expression | piece: Algebra tiles; Multiplying with blocks | no |
| 14 Quadratic functions & equations | quadratic, quadraticGraph, fnTransform | solve by taking square roots ((x + a)² = k); solve using structure; vertex read from vertex form; quadratic word problems in factored / vertex / standard form (only the ball); compare quadratic functions; scale & reflect parabolas as their own question | piece: Make it a square; Zeros and ends | yes: ball height (quadraticGraph); quadratic L3 bare |

#### Algebra 2

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Polynomial arithmetic | expand, readFunction (average rate of change) | polynomials intro; add & subtract polynomials; multiply monomials; monomial × polynomial; rest same as Algebra 1 unit 13 | piece: Algebra tiles; Multiplying with blocks | no |
| 2 Complex numbers | complex | roots of negative numbers (√−k); powers of i; real and imaginary parts; classify complex numbers; plot on the complex plane; add & subtract | worked answer only | no (L3 is a bare quadratic) |
| 3 Polynomial factorization | factor, polynomials (L2 cubic), series (L2 geometric sum) | factor monomials / GCF of monomials; quadratic patterns and substitution (x⁴ − 5x² + 4); factor using structure; polynomial identities; finite geometric series word problems | piece: Algebra tiles | no |
| 4 Polynomial division | polynomials (L1 remainder theorem) | dividing a polynomial (quotient and remainder); factor using division; "is (x − a) a factor?" | worked answer only | no |
| 5 Polynomial graphs | polyGraph | zeros from an expanded polynomial that must be factorised first | piece: Zeros and ends | yes: folded box volume |
| 6 Rational exponents and radicals | indices (L2, L3), surds | rational exponents with variables; rewrite exponential expressions (8ˣ = 2³ˣ, equivalent forms); solve exponential equations by matching bases | worked answer only | no |
| 7 Exponential models | exponential | interpret change and time in a model; rate per unit time after manipulation | piece: The growth race | yes: monthly-compounded equivalent rate (changing units) |
| 8 Logarithms | logs, exponential (L3 years to a target) | relationship log ↔ exponential (rewrite); change of base; solve aˣ = b with logs as a bare equation (base 10, e, 2) | worked answer only | logs: no; exponential: yes, years to a target |
| 9 Transformations of functions | fnTransform | graphs of square-root, cube-root, exponential and log functions; even/odd from graphs and tables | piece: Move the graph | yes: heating schedule shifted |
| 10 Equations | rootEquations, rationalFn, functions (inverse of a rational f) | quadratic systems (line and parabola); solve graphically in a word problem; inverse of a rational function as a formula | piece: Square and check | yes: stone dropped |
| 11 Trigonometry | trigexact, arcs (radians), identities, trigGraphs, trigEquations | phase shift (graph and model); construct a sinusoid from features (only b asked); graph a sinusoid | piece: Round the unit circle; Discover the unit circle; From the wheel to the wave | yes: harbour tide |
| 12 Modeling | formulae, readFunction | model with a combination of functions; periodicity and end behaviour of models; graph labels and scales; modelling and interpreting expressions with several variables; equations & inequalities word problems | worked answer only | no (formulae L3 is "make a the subject", bare) |

Not covered: Algebra 1 unit 15 (irrational numbers, no mastery exercises), units 16–17 (no exercises).

### Geometry, trigonometry, precalculus and statistics

#### High school geometry

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Performing transformations | transformations, shapeKinds | "Determine translations", "Determine rotations", "Determine reflections" (Zeno has only "which one move" at L2); "Determine reflections (advanced)"; "Dilations: scale factor", "Dilations: center" (find the factor or centre from an image); whole shapes moved (Zeno moves one point) | piece: moveShape (Move the shape) | yes: area of an enlarged shape; two moves in a row |
| 2 Transformation properties and proofs | transformations, symmetryLines, congruence | "Find measures using rigid transformations", "Rigid transformations: preserved properties", "Dilations and properties", "Mapping shapes", "Defining transformations", "Rotational symmetry of 2D shapes", "Proofs with transformations" | piece: moveShape; mirror (Lines of symmetry: fold the shape) | transformations yes (as unit 1); symmetryLines no (L3 = L1) |
| 3 Congruence | congruence, missingAngle, parallelAngles, constructions | "Line and angle proofs" (angle facts are only asked as numbers, never proved); the rest is asked (tests, parts, isosceles angles, parallelogram proof, justify constructions) | piece: buildTriangle, parallelLab, construct | yes: proofs in a parallelogram and on a perpendicular bisector |
| 4 Similarity | similarity | "Determine similar triangles: Angles", "Determine similar triangles: SSS", "Prove triangle similarity", "Solve similar right triangles", "Solve triangles: angle bisector theorem", "Use similar triangles", "Prove theorems using similarity" | piece: scalePlan (lengths and areas to scale); none for similar triangles | yes: area and volume ratios (mixed idea); no word context (shadows, heights) |
| 5 Right triangles & trigonometry | pythagoras, righttri, practicalTrig, trigexact, trigRules | "Special right triangles" (sides of 30-60-90 and 45-45-90 from one side), "Use ratios in right triangles", "Relate ratios in right triangles" (sin A = cos(90° − A)) | piece: pythDiscover, slopeWalk, sohcahtoa, trigBuild, trigDiscover | yes: ladder, box diagonal, ramp/cable angle, elevation and depression |
| 6 Analytic geometry | distance, line, slope, coordinates | "Divide line segments", "Area & perimeter on the coordinate plane", "Points inside/outside/on a circle", "Coordinate plane word problems: polygons", "Parallel & perpendicular lines from graph", "Classify figures by coordinates", "Parallel & perpendicular lines from equation" (only perpendicular through a point is asked) | piece: plotPoint, slopeLine (games); distance and midpoint worked answer only | coordinates yes: fourth corner of a rectangle; distance no (L3 = L2); line no |
| 7 Conic sections | conics | "Write standard equation of a circle", "Graph a circle from its features", "Graph a circle from its standard equation", "Graph a circle from its expanded equation" (Zeno only reads centre and radius) | piece: pinString (ellipse, parabola); circle worked answer only | yes: whispering gallery (ellipse) |
| 8 Circles | circles, arcs, powerPoint | "Arc measure", "Arc measure with equations", "Inscribed shapes" (beyond cyclic opposite angles), "Tangents of circles problems" (tangent ⟂ radius with lengths) | piece: geoLab (sectors, measured); circle theorems worked answer only | no (arcs L3 works a sector backwards; circles L3 same figures) |
| 9 Solid geometry | crossSections, volume, similarity | "Use related volumes" (cone as a third of a cylinder and the like), "Apply volume of solids" (word problems) | piece: solid, turned, coinStack | crossSections yes: density, population density; volume no (L3 a length from the volume) |

#### Trigonometry

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Right triangles & trigonometry | same as High school geometry unit 5 | plus "Reciprocal trig ratios" (sec, csc, cot appear in no skill) | as geometry unit 5 | as geometry unit 5 |
| 2 Trigonometric functions | trigexact, arcs, identities, trigGraphs | "Use the Pythagorean identity" (sin from cos in a given quadrant; Zeno's L2 is acute and double-angle), "Trig identities from reflections and rotations", "Graph sinusoidal functions", "Construct sinusoidal functions", "Graph sinusoidal functions: phase shift", "Model with sinusoidal functions", "Modeling with sinusoidal functions: phase shift" (no phase shift anywhere; L3 only reads b) | piece: unitCircleGame, circleDiscover, wheelWave | trigGraphs yes: harbour tide depth; trigexact no (L3 = radians) |
| 3 Non-right triangles & trigonometry | trigRules | none (sine rule, cosine rule and word problems all asked) | worked answer only | yes: bearings, cliff and tower |
| 4 Trigonometric equations and identities | trigEquations, identities | "Use the trig angle addition identities" (given sin a, cos b etc.; Zeno only 15°/75°/105°/165° and double angle) | piece: unitCircleGame for equations; identities worked answer only | trigEquations yes: harbour time at a given depth; identities no |

#### Precalculus

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Composite and inverse functions | functions, readFunction | "Evaluate composite functions: graphs & tables", "Find composite functions" (a formula; Zeno only fg(a) as a number), "Model with composite functions", "Determine if a function is invertible", "Restrict domains of functions to make them invertible", "Inverse functions: graphs and tables", "Verify inverse functions" | worked answer only | no (L3 = L2: f⁻¹(a)) |
| 2 Trigonometry | same as Trigonometry units 2–4 | same gaps (reflections, angle addition identities) | as Trigonometry | as Trigonometry |
| 3 Complex numbers | complex, polarForm, deMoivre | "Plot numbers on the complex plane", "Graphically add & subtract complex numbers", "Distance of complex numbers", "Midpoint of complex numbers", "Complex number conjugates", "Graphically multiply complex numbers", "Factor polynomials: complex numbers" (Zeno solves quadratics only) | worked answer only | no |
| 4 Rational functions | rationalFn, algFractions | "Mixtures and combined rates word problems", "Reduce rational expressions to lowest terms: Error analysis", "Multiply & divide rational expressions: Error analysis" | piece: asymptoteWalk, closeIn | rationalFn yes: printing cost per copy; algFractions no |
| 5 Conic sections | conics | "Graph & features of ellipses", "Center & radii of ellipses from equation" (completing the square), "Ellipse standard equation & graph", "Equation of an ellipse from features", "Vertices & direction of a hyperbola", "Equation of a hyperbola from features" | piece: pinString | yes: whispering gallery |
| 6 Vectors | vectors, dotangle, projection | "Vectors intro", "Components of vectors from endpoints", "Direction of vectors", "Vector components from magnitude & direction", "Add vectors: magnitude & direction", "Vector word problems" (Zeno works in components only) | piece: space (3D only); 2D worked answer only | no (L3 perpendicular k) |
| 7 Matrices | matrices, determinant, elimination | "Use matrices to represent data", "Multiply matrices by scalars", "Add & subtract matrices", "Use matrices to manipulate data", "Understand matrices as transformations of the plane", "Use matrices to transform the plane", "Use matrices to transform 3D and 4D vectors", "Use matrices to represent systems of equations", "Determine invertible matrices", "Use matrices to solve systems of equations" (by the inverse) | piece: cubeMatrix (3D shear) | no (L3 A² = aA + bI) |
| 8 Probability and combinatorics | probability, conditional, counting, expectation, twoWay | "Probability with general multiplication rule" (only two marbles), "Interpret probabilities of compound events", "Probability with permutations and combinations", "Graph probability distributions", "Develop probability distributions: Theoretical probabilities", "Develop probability distributions: Empirical probabilities", "Use probabilities to make fair decisions", "Interpret expected value", "Find expected payoffs" | piece: coin, dice, spinner, chance, cards, tableShares; counting and expectation worked answer only | conditional yes: medical test; probability, counting, expectation no |
| 9 Series | series, sequences, polynomials | "Finite geometric series word problems", "Summation notation intro"; "Expand binomials" only as one coefficient (polynomials L3) | worked answer only | no (series L3 a telescoping Σ) |
| 10 Limits and continuity | continuity, limits | "Creating tables for approximating limits", "Limits of combined functions: sums and differences", "Limits of combined functions: products and quotients", "Limits of composite functions", "Limits of trigonometric functions", "Limits using conjugates", "Limits using trig identities", "Infinite limits: algebraic", "Limits at infinity of quotients with square roots", "Strategy in finding limits" | piece: closeIn | yes: car-park charge (continuity L3) |

#### Statistics and probability

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Analyzing categorical data | twoWay, readChart, diagrams | "Individuals, variables, and categorical & quantitative data", "Create two-way frequency tables", "Create two-way relative frequency tables", "Identify marginal and conditional distributions", "Marginal distributions", "Trends in categorical data" | piece: tableShares, barChart, makeDiagram | yes: lateness by way to school (twoWay L3) |
| 2 Displaying and comparing quantitative data | spread, diagrams | "Creating frequency tables", "Creating dot plots", "Create histograms", "Shape of distributions", "Clusters, gaps, & peaks in data distributions", "Comparing distributions", "Comparing data displays", "Comparing data distributions", "Comparing center and spread" (only which box plot is more spread) | piece: boxSplit, makeDiagram | yes: two classes' box plots |
| 3 Summarizing quantitative data | average, spread | "Calculating the mean: data displays", "Calculating the median: data displays", "Missing value given the mean", "Median & range puzzlers", "Standard deviation of a population", "Variance", "Sample and population standard deviation", "Creating box plots"; "Effects of shifting, adding, & removing a data point" only as changing the largest value | piece: boxSplit | spread yes: one value changed, outlier fence; average no (L3 sample SD) |
| 4 Modeling data distributions | distributions | "Calculate percentiles", "Calculating z-scores", "Transforming data", "Properties of density curves", "Area under density curves", "Empirical rule", "Normal calculations in reverse" (areas above, below, between are asked) | piece: tTails (normal against t) | no (bare N(μ, σ²)) |
| 5 Exploring bivariate numerical data | scatter, correlation, regression | "Constructing scatter plots", "Making appropriate scatter plots", "Correlation coefficient intuition", "Estimating slope of line of best fit", "Residual plots", "Effects of influential points" | piece: fitLine | yes: association against cause (ice cream, fire engines, feet) |
| 6 Study design | sampling | "Statistical questions", "Valid claims", "Using probability to make fair decisions", "Experiment designs" (blocks, matched pairs) | piece: sampleField | yes: which plan shows a cause (reading app, plant food) |
| 7 Probability | probability, conditional, twoWay | "Comparing probabilities", "Subsets of sample spaces", "Basic set notation", "Experimental probability", "Making predictions with probability", "Interpret results of simulations", "Adding probabilities", "Two-way tables, Venn diagrams, and probability" (Venn), "Sample spaces for compound events", "Independent probability", "Probabilities of compound events", "Probability of "at least one" success", "Dependent and independent events" | piece: coin, dice, spinner, chance, cards | conditional yes: medical test; probability no (two marbles) |
| 8 Counting, permutations, and combinations | counting | "The counting principle", "Permutations & combinations with overcounting", "Probability with permutations and combinations" | worked answer only | no (letter arrangements) |
| 9 Random variables | expectation, distributions, limitTheorems | "Constructing probability distributions", "Probability models", "Standard deviation of a discrete random variable", "Probability in density curves", "Probability in normal density curves", "Transforming random variables" (only Var(aX + b)), "Combining random variables", "Combining normal random variables", "Identifying binomial variables", "Mean and standard deviation of a binomial random variable", "Binomial vs. geometric random variables", "Geometric probability", "Cumulative geometric probability", "Expected value with empirical probabilities", "Expected value with calculated probabilities", "Making decisions with expected values" | worked answer only | no |
| 10 Sampling distributions | limitTheorems, tTests, estimators | "Biased and unbiased estimators" (estimators asks a numeric bias, grade 13), "Mean and standard deviation of sample proportions", "Finding probabilities with sample proportions"; normal condition only inside tTests L1 | piece: sampleField | no |
| 11 Confidence intervals | ci, tTests | "Conditions for a z interval for a proportion", "Finding the critical value z* for a desired confidence level", "Sample size and margin of error in a z interval for p", "Conditions for a t interval for a mean", "Finding the critical value t* for a desired confidence level", "Sample size and margin of error in a confidence interval for a mean" | piece: tTails | no (ci L3 a bare yes-count) |
| 12 Significance tests | hypothesis, tTests, twoSample | "Simple hypothesis testing", "Writing null and alternative hypotheses", "Estimating P-values from simulations", "Writing hypotheses for a test about a proportion", "Calculating the P-value in a z test for a proportion", "Making conclusions in a z test for a proportion", "Writing hypotheses for a test about a mean", "Conditions for a t test about a mean", "Calculating the P-value in a t test for a mean", "Making conclusions in a t test for a mean" | piece: tTails; otherwise worked answer only | yes: paired t on fields and runners; which test fits |
| 14 Inference for categorical data | chiSquared | "Conditions for a goodness-of-fit test", "Expected counts in a goodness-of-fit test" (Zeno: under independence only), P-value halves of "Test statistic and P-value ..." (both), "Conclusions in a goodness-of-fit test", "Making conclusions in chi-square tests for two-way tables" | worked answer only | no |

#### AP Statistics

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Exploring one-variable data and collecting data | same as Statistics and probability units 2, 3, 6 (average, spread, diagrams, sampling) | plus "Classify discrete and continuous quantitative variables", "Create frequency tables and relative frequency tables", "Describing distributions", "Estimating mean and median in data displays", "Visually assess standard deviation", "Compare distributions using summary statistics", "Comparing with z-scores", "Identify a census", "Generalizability of results", "Components of an investigative question", "Sampling with and without replacement", "Sampling method considerations", "Bias in samples and surveys", "Experiment design considerations" | piece: boxSplit, sampleField | as Statistics units 2, 3, 6 |
| 2 Probability, random variables, and probability distributions | same as Statistics and probability units 1, 4, 7, 9 | plus "Mosaic plots", "Probability of complements", "Estimate binomial probability from simulations" | as those units | as those units |
| 3 Inference for categorical data: proportions | same as Statistics and probability units 10–12, 14 | plus "Identify statistics and parameters", "Justify a claim based on a confidence interval for a population proportion", and every two-proportion exercise: "Mean and standard deviation of difference of sample proportions", "Shape of sampling distributions for differences in sample proportions", "Conditions for inference on two proportions", "Two-sample z interval for the difference of proportions", "Justify a claim based on the confidence interval for the difference between two proportions", "Writing hypotheses for testing the difference of proportions", "Test statistic in a two-sample z test for the difference of proportions", "P-value in a two-sample z test for the difference of proportions", "Making conclusions about the difference of proportions" | as those units | as those units |
| 4 Inference for quantitative data: means | same as Statistics and probability units 10–12; twoSample asks the two-sample t statistic and interval | plus "Justify a claim based on a confidence interval for a population mean", "Mean and standard deviation of difference of sample means", "Conditions for inference on two means", "Justify a claim based on a confidence interval for the difference between two means", "Writing hypotheses to test the difference of means", "P-value in a two-sample t test", "Making conclusions about the difference of means" | piece: tTails | yes: which test fits (twoSample L3) |
| 5 Regression analysis | same as Statistics and probability unit 5 | plus "Identify interpolation and extrapolation", "Using least-squares regression output" (twoSample L3 reads only b and its SE), "Describing scatterplots" (form, direction, strength, unusual points together) | piece: fitLine | as Statistics unit 5 |

Not covered: none in this group. Statistics and probability units 13, 15 and 16 have no exercises that count; Geometry unit 4 lists "Rational equations intro", which belongs to algebra.

### Calculus, differential equations and linear algebra

#### AP Calculus AB

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Limits and continuity | continuity, limits | limits read from a drawn graph (one-sided, infinite, at infinity); limits of sums, products, quotients and composites from given limits; conjugates; trig identities; quotients with square roots at infinity; choosing a method after 0/0 ("Strategy in finding limits"); continuity over an interval | piece: Close in on the break | yes: car park charge (continuity L3); limits L3 no |
| 2 Differentiation: definition and basic rules | differentiate, tangent, readFunction (average rate) | derivative as a limit of (f(a+h) − f(a))/h; estimating f′ from a table; differentiability (graph and algebra); rules with tables of f, g, f′, g′ (sum, product, quotient); tan, cot, sec, csc; "find the error"; "Derivatives that help with finding limits" | piece: Chords on a curve | no |
| 3 Composite, implicit, inverse functions | differentiate (L2 chain, L3 mixed), implicit (L1, L2) | chain rule with tables; aˣ and logₐx; derivative of an inverse function at a point; inverse trig derivatives; second derivatives (also implicit); identifying the composite; rewriting before differentiating | worked answer only | no |
| 4 Contextual applications | derivContext, implicit (L3 related rates), limits (L3 L'Hôpital) | interpreting motion graphs; related rates beyond the ladder and the ripple (several rates, cones, shadows, writing the related equation); L'Hôpital for ∞/∞ (Zeno: 0/0 at x = 0 only); linear approximation of rational functions | piece: Trace the path (motion only) | yes: ladder, ripple, tank, tea |
| 5 Analytical applications | stationary, derivContext (L2, L3), mvt | increasing/decreasing intervals; concavity and inflection points; second derivative test; absolute extrema on the whole domain; f, f′, f″ graphs matched; written justifications; horizontal/vertical tangents of implicit curves | piece: Fold the box (optimisation only) | yes: fence pen, open box (derivContext L3); stationary no |
| 6 Integration and accumulation of change | accumulation, integrate, definite, intTechniques (L1) | summation notation; Riemann sums in sigma notation and as a limit; integrals from area formulas and net area of a drawn graph; properties (adjacent intervals, reversed limits, given pieces); piecewise and jump integrands; reading an accumulation function's behaviour; defining u; definite u-substitution; long division and completing the square before integrating | piece: Fill under the curve | yes: tank inflow, braking cyclist (accumulation); integrate, definite no |
| 7 Differential equations | slopeFields, odeFirst (L1 separable) | writing a DE from words; separable equations beyond y′ = kxⁿy; telling separable from not; domain of a particular solution; "find the error" | piece: Drop a point | yes: fish in a lake (slopeFields L3) |
| 8 Applications of integration | accumulation (average value, motion), intApplications | horizontal (dy) areas; composite areas; curves crossing more than twice; volumes with square, rectangle, triangle and semicircle cross sections; discs about other axes; washers; integrals interpreted in context | piece: Solid of revolution; Lean the stack | yes: braking cyclist (accumulation L3); intApplications no |

#### AP Calculus BC

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Limits and continuity | same as AP Calculus AB unit 1 | | | |
| 2 Differentiation: definition and basic rules | same as AP Calculus AB unit 2 | | | |
| 3 Composite, implicit, inverse functions | same as AP Calculus AB unit 3 | | | |
| 4 Contextual applications | same as AP Calculus AB unit 4 | | | |
| 5 Analytical applications | same as AP Calculus AB unit 5 | | | |
| 6 Integration and accumulation of change | same as AP Calculus AB unit 6, plus intTechniques (L2 parts, L3 partial fractions), improper | AB unit 6 gaps; definite integration by parts | piece: Fill under the curve | as AB unit 6; intTechniques, improper no |
| 7 Differential equations | same as AP Calculus AB unit 7, plus numericalOde (L1 Euler) | AB unit 7 gaps | piece: Drop a point | yes: fish in a lake |
| 8 Applications of integration | same as AP Calculus AB unit 8, plus intApplications L3 (arc length) | AB unit 8 gaps | piece: Solid of revolution | as AB unit 8 |
| 9 Parametric, polar, vector-valued | parametric, curves (L1 speed) | d²y/dx² of a parametric curve; differentiating r(t) and its second derivative; position from a velocity vector (planar motion with integrals); dy/dx and tangents of polar curves; area between two polar curves | piece: Trace the path | yes: ball hit from the ground (parametric L2, L3) |
| 10 Infinite sequences and series | seqLimits, series, convergence, powerSeries, taylor, mvt (L3 Lagrange) | partial sums from sₙ; applying the integral, direct and limit comparison tests (Zeno L2 only names the test); alternating series remainder; a function as a geometric series; integrating and differentiating power series | worked answer only | no |

#### Differential Calculus

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Limits and continuity | same as AP Calculus AB unit 1 | plus "Limits at infinity of quotients with trig" | | |
| 2 Derivatives: definition and basic rules | same as AP Calculus AB unit 2 | plus average rate over [a, a + h] with arbitrary points, simplified | | |
| 3 Chain rule and other advanced topics | same as AP Calculus AB unit 3 | ("Composite exponential function differentiation" is asked: e^(kx), e^(x²)) | | |
| 4 Applications of derivatives | same as AP Calculus AB unit 4 | ("L'Hôpital (composite exponential)" partly: limits L2 asks (1 + a/x)^(bx)) | | |
| 5 Analyzing functions | same as AP Calculus AB unit 5 | | | |
| 6 Parametric, polar, vector-valued | same as AP Calculus BC unit 9 (its derivative half) | | | |

#### Integral Calculus

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Integrals | same as AP Calculus BC unit 6 | plus trigonometric substitution ("Integrating trig functions" and trig identities are asked: integrate L3, intTechniques L3) | | |
| 2 Differential equations | same as AP Calculus BC unit 7 | | | |
| 3 Applications of integrals | same as AP Calculus BC unit 8 | | | |
| 4 Parametric, polar, vector-valued | same as AP Calculus BC unit 9 (its integral half) | plus arc length of polar curves | | |
| 5 Series | same as AP Calculus BC unit 10 | | | |

#### Multivariable Calculus

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Thinking about multivariable functions | (no Khan exercises) | | piece: Surfaces z = f(x, y) | |
| 2 Derivatives of multivariable functions | partials, chainMulti, curves (L1 speed) | higher-order and mixed partials; reading a gradient field picture; partials of vector-valued functions and parametric surfaces; divergence and curl (picture and formula, 2D and 3D); the Laplacian; the Jacobian determinant (Zeno asks the matrix only) | piece: Surfaces z = f(x, y): slices, gradient, descent | no |
| 3 Applications of multivariable derivatives | partials (L3 tangent plane), extremaMulti | writing the Hessian matrix; zero gradient read from a picture | piece: Surfaces z = f(x, y) | no (Lagrange L3 has no setting) |
| 4 Integrating multivariable functions | multipleIntegrals, changeVariables, lineIntegrals | line integrals of scalar functions (∫ f ds); finding the bounds of a region; triple integrals in x, y, z; a general change of variables (new bounds, Jacobian factor, area elements); surface area by a surface integral | worked answer only | no |
| 5 Green's, Stokes', divergence theorems | vectorTheorems | the flux (normal) form of Green's theorem; orientations and boundaries; simple, closed, connected, piecewise-smooth curves and regions | worked answer only | no |

#### Differential Equations (lesson outline)

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 First order differential equations | slopeFields, odeFirst, numericalOde (L1 Euler), stability | writing a DE (same as AP Calculus AB unit 7); separable equation with an implicit solution; Newton's law of cooling solved; first-order homogeneous equations y′ = F(y/x) | piece: Drop a point | yes: fish in a lake (slopeFields L3); odeFirst no |
| 2 Second order linear equations | odeSecond | undetermined coefficients with sine/cosine, polynomial and sum forcing ("Undetermined coefficients 2–4"; Zeno: exponential or line only) | worked answer only | no |
| 3 Laplace transform | laplace | the shift rule (e^(at)f(t)); unit step function; Dirac delta; step-function equations; convolution and the convolution theorem | worked answer only | no |

#### Linear Algebra (lesson outline)

| Khan unit | Zeno skills | Asked by Khan, not by Zeno | Stage 1 | Stage 4 |
|---|---|---|---|---|
| 1 Vectors and spaces | vectors, dotangle, projection, subspaces, basis, elimination, rankNullity | unit vectors; magnitude and direction to components; parametric lines; cross product; plane from a point and a normal, normal from a plane, point-to-plane and plane-to-plane distance; a basis of the null space and of the column space (Zeno: one null vector, rank, nullity) | piece: Vectors in space: cross product, lines and planes | no |
| 2 Matrix transformations | linearMaps, matrices, determinant | matrices of scalings, reflections, rotations (2D and 3D) and projection onto a line; matrix from a picture of the map; composition as a product; image, preimage, kernel; onto and one-to-one; 3 × 3 inverse (Zeno: 2 × 2); determinant after row operations, triangular and 4 × 4 determinants; determinant as area and scale factor; transpose rules; row space and left null space | piece: 3D matrix: shear the unit cube; Move the shape | no |
| 3 Alternate coordinate systems (bases) | basis, linearMaps (L3), innerProducts, projection, eigen, spectral | orthogonal complements; projection onto a subspace and its matrix; coordinates in an orthonormal basis; orthogonal matrices; eigenspaces (a basis of each, 3 × 3) | piece: Squares on the residuals (least squares); PCA lab | no (least-squares line L3 is pure points) |

Not covered: none found; every unit with exercises has at least one Zeno skill.
