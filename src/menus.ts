// The toolbar's menus, by topic and heading. The board's toolbar, its Shapes panel and the tool search are all built
// from this list; the tools themselves are in tools.tsx.
import type { BarIconName } from "./components/BarIcon";
import type { LiveKind } from "./math/live";
import type { ToolKind, Word } from "./tools";

/** A menu entry: a tool, optionally opened on a given topic, or a live piece (named as in the Shapes panel). */
export type MenuEntry = { kind: ToolKind; icon: string; label: Word; start?: string };
export type LiveEntry = { live: LiveKind; icon: string };
export const isLiveEntry = (e: MenuEntry | LiveEntry): e is LiveEntry => "live" in e;
/** A heading in a menu and what is under it, roughly from the first thing a learner meets to the last. */
export type MenuSection = { title?: Word; items: (MenuEntry | LiveEntry)[] };
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
          { live: "cubes", icon: "🟥" },
          { live: "baseTen", icon: "🧊" },
          { live: "hundred", icon: "💯" },
          { live: "soroban", icon: "🧮" },
          { live: "numberShapes", icon: "⠿" },
        ],
      },
      {
        title: "secCalculating", items: [
          { kind: "mental", icon: "🧠", label: "mental" },
          { kind: "model", icon: "▦", label: "models" },
          { live: "compare", icon: "⚖" },
          { live: "dots", icon: "⁘" },
          { live: "numberLine", icon: "↔" },
          { live: "division", icon: "÷" },
        ],
      },
      {
        title: "secFractions", items: [
          { live: "fractions", icon: "◔" },
          { live: "compareFractions", icon: "½" },
        ],
      },
      { title: "secTime", items: [{ live: "clock", icon: "🕒" }] },
    ],
  },
  {
    icon: "geometry", label: "groupGeometryShort", title: "groupGeometry", sections: [
      {
        title: "secShapes", items: [
          { live: "geoLab", icon: "📐" },
          { kind: "geometry", icon: "📐", label: "geometry" },
          { kind: "euclid", icon: "⊙", label: "euclidTool" },
          { kind: "3d", icon: "🧊", label: "threeD" },
        ],
      },
      {
        title: "secCoordinates", items: [
          { kind: "coord", icon: "xy", label: "coord" },
          { kind: "vectors", icon: "↗", label: "vectors" },
        ],
      },
      {
        title: "secTrig", items: [
          { kind: "trig", icon: "θ", label: "trig" },
          { kind: "identities", icon: "≡", label: "identitiesTool" },
        ],
      },
    ],
  },
  {
    icon: "algebra", label: "groupAlgebraShort", title: "groupAlgebra", sections: [
      {
        title: "secExpressions", items: [
          { live: "algebraTiles", icon: "▦" },
          { kind: "formula", icon: "∑", label: "formula" },
          { kind: "algebra", icon: "⚖", label: "algebra" },
          { kind: "powers", icon: "xⁿ", label: "powers" },
          { kind: "polynomials", icon: "x³", label: "polynomialsTool" },
          { kind: "sequences", icon: "aₙ", label: "sequences" },
        ],
      },
      {
        title: "secFunctions", items: [
          { kind: "functions", icon: "f(x)", label: "functionsTool" },
          { kind: "graph", icon: "📈", label: "graph" },
          { live: "graph", icon: "🎚" },
        ],
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
        ],
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
          { live: "chance", icon: "🎰" },
          { kind: "randvar", icon: "E[X]", label: "randvar" },
        ],
      },
      {
        title: "secStatistics", items: [
          { kind: "statistics", icon: "📊", label: "statistics" },
          { kind: "inference", icon: "H₀", label: "inference" },
          { kind: "regression", icon: "ŷ", label: "regression" },
          { kind: "likelihood", icon: "L(θ)", label: "likelihood" },
          { kind: "information", icon: "H(p)", label: "information" },
          { kind: "naiveBayes", icon: "P(c|w)", label: "naiveBayes" },
        ],
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
        title: "senseNumberPatterns", items: [
          { live: "growing", icon: "🧱" },
          { live: "machine", icon: "⚙️" },
          { live: "divisible", icon: "➗" },
          { live: "primeSlice", icon: "✂️" },
        ],
      },
      {
        title: "senseFraction", items: [
          { live: "shadeFrac", icon: "◔" },
          { live: "fractionWall", icon: "▤" },
          { live: "equivMatch", icon: "🃏" },
          { live: "fracOrder", icon: "⇢" },
        ],
      },
      {
        title: "senseAlgebra", items: [
          { live: "balance", icon: "⚖️" },
          { live: "exprMatch", icon: "x=" },
        ],
      },
      {
        title: "senseShape", items: [
          { live: "geoboard", icon: "⬠" },
          { live: "mirror", icon: "🦋" },
          { live: "angleGuess", icon: "∠" },
          { live: "angleHunt", icon: "📐" },
          { live: "views3d", icon: "🧊" },
          { live: "cubeNet", icon: "🎲" },
        ],
      },
      {
        title: "senseChart", items: [
          { live: "plotPoint", icon: "⌖" },
          { live: "barChart", icon: "📊" },
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
