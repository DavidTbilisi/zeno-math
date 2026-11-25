// The toolbar's menus, by topic and heading. The board's toolbar, its Shapes panel (live pieces and ready-made
// pictures alike) and the tool search are all built from this list; the tools themselves are in tools.tsx.
import type { BarIconName } from "./components/BarIcon";
import type { LiveKind } from "./math/live";
import type { ToolKind, Word } from "./tools";

/** A menu entry: a tool, optionally opened on a given topic, or a live piece (named as in the Shapes panel). */
export type MenuEntry = { kind: ToolKind; icon: string; label: Word; start?: string };
export type LiveEntry = { live: LiveKind; icon: string };
export const isLiveEntry = (e: MenuEntry | LiveEntry): e is LiveEntry => "live" in e;
/**
 * A heading in a menu and what is under it, roughly from the first thing a learner meets to the last. `shapes` are
 * ready-made pictures (ids in math/shapes.ts), shown under the same heading in the Shapes panel but not in the menu;
 * a section with only shapes appears only in the panel.
 */
export type MenuSection = { title?: Word; items: (MenuEntry | LiveEntry)[]; shapes?: string[] };
export type MenuGroup = { icon: BarIconName; label: Word; title?: Word; sections: MenuSection[] };

/**
 * The toolbar's menus, which the Shapes panel follows too. Each topic menu holds its tools and its hands-on pieces;
 * Games holds only the pieces with levels and a score (the drill ladder), by the sense they train. Every live piece is
 * in exactly one place (tests/menus.test.ts).
 */
export const MENUS: MenuGroup[] = [
  {
    icon: "arithmetic", label: "groupArithmetic", sections: [
      {
        title: "secCounting", items: [
          { live: "tenFrame", icon: "🔟" },
          { live: "rekenrek", icon: "📿" },
          { live: "cubes", icon: "🟥" },
          { live: "rods", icon: "📏" },
          { live: "baseTen", icon: "🧊" },
          { live: "hundred", icon: "💯" },
          { live: "soroban", icon: "🧮" },
          { live: "numberShapes", icon: "⠿" },
        ], shapes: ["tenFrame", "oneCube", "tenRod", "hundredFlat", "hundredSquare", "placeValue"],
      },
      {
        title: "secCalculating", items: [
          { kind: "mental", icon: "🧠", label: "mental" },
          { kind: "model", icon: "▦", label: "models" },
          { live: "compare", icon: "⚖" },
          { live: "dots", icon: "⁘" },
          { live: "areaBlocks", icon: "🧱" },
          { live: "numberLine", icon: "↔" },
          { live: "counters", icon: "±" },
          { live: "signArrow", icon: "↻" },
          { live: "signPattern", icon: "⟋" },
          { live: "division", icon: "÷" },
          { live: "rootZoom", icon: "√" },
          { live: "absLine", icon: "|x|" },
        ], shapes: ["numberLine", "barModel", "partWhole", "multiplicationSquare"],
      },
      {
        title: "secFractions", items: [
          { live: "fractions", icon: "◔" },
          { live: "compareFractions", icon: "½" },
          { live: "twoChanges", icon: "%" },
        ], shapes: ["fractionWall", "quarters", "eighths", "numberLine01"],
      },
      { title: "secTime", items: [{ live: "clock", icon: "🕒" }], shapes: ["clock"] },
    ],
  },
  {
    icon: "geometry", label: "groupGeometryShort", title: "groupGeometry", sections: [
      { title: "secMeasuring", items: [], shapes: ["ruler", "protractor", "protractor360", "setSquare45", "setSquare30"] },
      {
        title: "secPlane", items: [
          { live: "geoLab", icon: "📐" },
          { live: "parallelLab", icon: "∥" },
          { live: "moveShape", icon: "⇄" },
          { live: "buildTriangle", icon: "≅" },
          { live: "construct", icon: "⌒" },
          { live: "scalePlan", icon: "📐" },
          { kind: "geometry", icon: "📐", label: "geometry" },
          { kind: "euclid", icon: "⊙", label: "euclidTool" },
        ],
        shapes: [
          "angle", "parallel", "transversalAngles", "triangle", "rightTriangle", "parallelogram", "rhombus", "kite", "trapezium",
          "pentagon", "hexagon", "octagon", "circleParts",
        ],
      },
      {
        title: "secSolids", items: [{ live: "solid", icon: "🧊" }, { live: "turned", icon: "🔄" }, { live: "cubeMatrix", icon: "🎲" }, { live: "coinStack", icon: "🪙" }],
        shapes: ["cube", "cuboid", "prism", "cylinder", "pyramid", "cone", "sphere", "netCube", "netCuboid", "netPrism", "netPyramid", "netCylinder", "isometricDots"],
      },
      {
        title: "secCoordinates", items: [
          { kind: "coord", icon: "xy", label: "coord" },
          { kind: "vectors", icon: "↗", label: "vectors" },
          { live: "space", icon: "🧭" },
        ], shapes: ["gridPaper", "axesQ1", "axes", "axes3d"],
      },
      {
        title: "secTrig", items: [
          { kind: "trig", icon: "θ", label: "trig" },
          { kind: "identities", icon: "≡", label: "identitiesTool" },
          { live: "slopeWalk", icon: "🚶" },
          { live: "wheelWave", icon: "🎡" },
        ], shapes: ["trigTriangle", "unitCircle"],
      },
    ],
  },
  {
    icon: "algebra", label: "groupAlgebraShort", title: "groupAlgebra", sections: [
      {
        title: "secExpressions", items: [
          { live: "algebraTiles", icon: "▦" },
          { live: "completeSquare", icon: "◰" },
          { kind: "formula", icon: "∑", label: "formula" },
          { kind: "algebra", icon: "⚖", label: "algebra" },
          { kind: "powers", icon: "xⁿ", label: "powers" },
          { kind: "polynomials", icon: "x³", label: "polynomialsTool" },
          { kind: "sequences", icon: "aₙ", label: "sequences" },
        ], shapes: ["tile1", "tileX", "tileX2", "tileY", "tileXY", "tileNeg1", "tileNegX", "tileNegX2", "balance"],
      },
      {
        title: "secFunctions", items: [
          { kind: "functions", icon: "f(x)", label: "functionsTool" },
          { kind: "graph", icon: "📈", label: "graph" },
          { live: "graph", icon: "🎚" },
          { live: "secantRate", icon: "⌒" },
          { live: "testPoints", icon: "◩" },
          { live: "growthRace", icon: "🌱" },
          { live: "polyShape", icon: "〰" },
          { live: "asymptoteWalk", icon: "⫲" },
          { live: "squareCheck", icon: "√" },
          { live: "moveGraph", icon: "⤢" },
        ], shapes: ["functionMachine", "axesSketch"],
      },
      {
        title: "secMatrices", items: [
          { kind: "matrix", icon: "[ ]", label: "matrices" },
          { kind: "complex", icon: "ℂ", label: "complex" },
        ],
      },
      {
        title: "secCalculus", items: [
          { kind: "analysis", icon: "ε", label: "analysis" },
          { kind: "deriv", icon: "f′", label: "deriv" },
          { kind: "integral", icon: "∫", label: "integrals" },
          { kind: "applied", icon: "∫⌒", label: "applied" },
          { kind: "multivar", icon: "∇", label: "multivar" },
          { live: "surface", icon: "⛰" },
          { kind: "ode", icon: "y′", label: "odes" },
          { kind: "numerical", icon: "≈", label: "numericalTool" },
        ],
      },
    ],
  },
  {
    icon: "discrete", label: "groupDiscreteShort", title: "groupDiscrete", sections: [
      {
        title: "secDiscrete", items: [
          { kind: "nt", icon: "ℤ", label: "nt" },
          { kind: "logic", icon: "∧", label: "logic" },
          { kind: "comb", icon: "ⁿCₖ", label: "comb" },
          { kind: "gt", icon: "⬡", label: "gt" },
        ], shapes: ["venn2", "venn3"],
      },
      {
        title: "secProblemSolving", items: [
          { kind: "tactics", icon: "♟", label: "tactics" },
          { kind: "strategies", icon: "♞", label: "strategies" },
          { live: "rubik", icon: "🧩" },
        ],
      },
      {
        title: "secAlgorithms", items: [
          { kind: "algo", icon: "⇅", label: "algo" },
          { live: "patterns", icon: "👆" },
          { live: "problems", icon: "🧑‍💻" },
          { live: "solver", icon: "🧮" },
        ],
      },
      {
        title: "secChance", items: [
          { live: "coin", icon: "🪙" },
          { live: "dice", icon: "🎲" },
          { live: "spinner", icon: "🌀" },
          { live: "cards", icon: "🃏" },
          { live: "chance", icon: "🎰" },
          { kind: "randvar", icon: "E[X]", label: "randvar" },
        ], shapes: ["probabilityScale", "dice", "spinner", "sampleSpace", "tree", "twoWay"],
      },
      {
        title: "secStatistics", items: [
          { live: "boxSplit", icon: "▭" },
          { live: "tableShares", icon: "▦" },
          { live: "fitLine", icon: "⟋" },
          { live: "sampleField", icon: "🐟" },
          { live: "tTails", icon: "t" },
          { kind: "statistics", icon: "📊", label: "statistics" },
          { kind: "inference", icon: "H₀", label: "inference" },
          { kind: "regression", icon: "ŷ", label: "regression" },
          { kind: "likelihood", icon: "L(θ)", label: "likelihood" },
          { kind: "information", icon: "H(p)", label: "information" },
          { kind: "naiveBayes", icon: "P(c|w)", label: "naiveBayes" },
        ], shapes: ["boxPlot"],
      },
    ],
  },
  {
    icon: "ai", label: "groupAi", title: "groupAiTitle", sections: [
      {
        title: "secAiSteps", items: [
          { kind: "ai", icon: "⊞", label: "aiTensors", start: "tensor" },
          { kind: "ai", icon: "⇄", label: "aiOps", start: "ops" },
          { kind: "ai", icon: "↘", label: "aiDescent", start: "descent" },
          { kind: "ai", icon: "∂", label: "aiBackprop", start: "backprop" },
          { kind: "ai", icon: "eᶻ", label: "aiSoftmax", start: "softmax" },
          { kind: "ai", icon: "∠", label: "aiEmbed", start: "embed" },
          { kind: "ai", icon: "Σ", label: "aiSvd", start: "svd" },
        ],
      },
      {
        title: "secAiLearning", items: [
          { live: "tensorLab", icon: "🧊" },
          { live: "descentLab", icon: "⛳" },
          { live: "backpropLab", icon: "🔙" },
          { live: "fitLab", icon: "〰" },
          { live: "batchLab", icon: "🎯" },
        ],
      },
      {
        title: "secAiModels", items: [
          { live: "softmaxLab", icon: "📊" },
          { live: "rocLab", icon: "⚖" },
          { live: "knnLab", icon: "📍" },
          { live: "treeLab", icon: "🌳" },
          { live: "kmeansLab", icon: "✳" },
          { live: "pcaLab", icon: "📏" },
        ],
      },
      {
        title: "secAiDeep", items: [
          { live: "nnLab", icon: "🕸" },
          { live: "convLab", icon: "▩" },
          { live: "embedLab", icon: "🧭" },
          { live: "rnnLab", icon: "🔁" },
          { live: "attnLab", icon: "👁" },
          { live: "rlLab", icon: "🎲" },
        ],
      },
    ],
  },
  {
    icon: "practice", label: "practice", sections: [
      {
        items: [
          { kind: "practice", icon: "🔢", label: "practiceNumber", start: "number" },
          { kind: "practice", icon: "⚖", label: "practiceAlgebra", start: "algebra" },
          { kind: "practice", icon: "📐", label: "practiceGeometry", start: "geometry" },
          { kind: "practice", icon: "∫", label: "practiceCalculus", start: "calculus" },
          { kind: "practice", icon: "🎲", label: "practiceData", start: "data" },
        ],
      },
    ],
  },
  {
    icon: "games", label: "gamesMenu", sections: [
      {
        title: "senseNumber", items: [
          { live: "quickLook", icon: "👀" },
          { live: "estimate", icon: "📍" },
          { live: "closerTo", icon: "≈" },
          { live: "target", icon: "🎯" },
          { live: "kakooma", icon: "🔢" },
        ],
      },
      {
        title: "senseFacts", items: [
          { live: "rainPlus", icon: "🌧️" },
          { live: "rainTimes", icon: "🌧️" },
          { live: "runPlus", icon: "🏃" },
          { live: "runTimes", icon: "🏃" },
          { live: "joinSum", icon: "🧩" },
          { live: "joinProduct", icon: "🧩" },
        ],
      },
      {
        title: "senseNumberPatterns", items: [
          { live: "growing", icon: "🧱" },
          { live: "machine", icon: "⚙️" },
          { live: "divisible", icon: "➗" },
          { live: "primeSlice", icon: "✂️" },
          { live: "doubleLine", icon: "⚌" },
        ],
      },
      {
        title: "senseFraction", items: [
          { live: "shadeFrac", icon: "◔" },
          { live: "fractionWall", icon: "▤" },
          { live: "equivMatch", icon: "🃏" },
          { live: "fracOrder", icon: "⇢" },
          { live: "stripes", icon: "▦" },
          { live: "foldStrip", icon: "🗞" },
          { live: "fitTiles", icon: "📏" },
          { live: "findWhole", icon: "🧩" },
          { live: "overflowBars", icon: "🫗" },
          { live: "shareBags", icon: "🍬" },
          { live: "frogJumps", icon: "🐸" },
          { live: "makeOne", icon: "🥧" },
          { live: "tileDrop", icon: "🧱" },
          { live: "pizzaSlice", icon: "🍕" },
        ],
      },
      {
        title: "senseAlgebra", items: [
          { live: "balance", icon: "⚖️" },
          { live: "exprMatch", icon: "x=" },
        ],
      },
      {
        title: "senseWhich", items: [
          { live: "whichWord", icon: "🧰" },
          { live: "whichFrac", icon: "🧰" },
          { live: "whichEq", icon: "🧰" },
          { live: "whichQuad", icon: "🧰" },
        ],
      },
      {
        title: "senseCrux", items: [
          { live: "cruxWord", icon: "🔑" },
          { live: "cruxEq", icon: "🔑" },
        ],
      },
      {
        title: "senseShape", items: [
          { live: "geoboard", icon: "⬠" },
          { live: "mirror", icon: "🦋" },
          { live: "shapeSort", icon: "◎" },
          { live: "angleGuess", icon: "∠" },
          { live: "angleHunt", icon: "📐" },
          { live: "trigBuild", icon: "🪜" },
          { live: "unitCircleGame", icon: "◴" },
          { live: "sohcahtoa", icon: "◺" },
          { live: "trigDiscover", icon: "🔍" },
          { live: "pythDiscover", icon: "⊿" },
          { live: "circleDiscover", icon: "◕" },
          { live: "tessellate", icon: "⬡" },
          { live: "views3d", icon: "🧊" },
          { live: "cubeNet", icon: "🎲" },
        ],
      },
      {
        title: "senseChart", items: [
          { live: "plotPoint", icon: "⌖" },
          { live: "barChart", icon: "📊" },
          { live: "makeDiagram", icon: "🥧" },
          { live: "graphStory", icon: "🚶" },
          { live: "slopeLine", icon: "📈" },
        ],
      },
      {
        title: "senseGraph", items: [
          { live: "oneStroke", icon: "✍️" },
          { live: "colourMap", icon: "🎨" },
          { live: "shortestPath", icon: "🧭" },
          { live: "connectTowns", icon: "🛤️" },
        ],
      },
      {
        title: "senseAlgo", items: [
          { live: "beSort", icon: "🔀" },
          { live: "beBinary", icon: "🔍" },
          { live: "bePointers", icon: "👉" },
          { live: "beWindow", icon: "🪟" },
          { live: "beSearch", icon: "🔦" },
          { live: "beBacktrack", icon: "♛" },
          { live: "beDp", icon: "▦" },
          { live: "beTopo", icon: "➡️" },
          { live: "beName", icon: "🏷️" },
        ],
      },
      {
        title: "senseData", items: [
          { live: "beStack", icon: "📚" },
          { live: "beHeap", icon: "⛰️" },
          { live: "beTree", icon: "🌳" },
          { live: "beUnion", icon: "🔗" },
        ],
      },
      {
        title: "senseSystem", items: [
          { live: "beCache", icon: "🗄️" },
          { live: "beBalance", icon: "⚖️" },
          { live: "beRing", icon: "⭕" },
          { live: "beLimit", icon: "🚦" },
          { live: "beQueue", icon: "📨" },
          { live: "beQuorum", icon: "🗃️" },
          { live: "beComp", icon: "🧱" },
        ],
      },
    ],
  },
];

/** The menu's name for a tool: its entry on the given topic if it has one of its own, else its plain entry. */
export function toolLabel(kind: ToolKind, start?: string): Word | undefined {
  const entries = MENUS.flatMap((g) => g.sections.flatMap((s) => s.items)).filter((e): e is MenuEntry => !isLiveEntry(e) && e.kind === kind);
  return (entries.find((e) => e.start === start) ?? entries.find((e) => !e.start))?.label;
}
