// Every tool in one table: its dialog (loaded the first time it opens) and its edit title (menus.ts places it in the menus).
// The board page and the tool search open them from here.
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Dict } from "./locales/en";
import { AREAS, SKILLS } from "./math/practiceSkills";

/** Keys of the dictionary that hold a plain string. */
export type Word = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];

/** What every tool dialog accepts. `initial` is the stored spec when editing; `start` opens a given topic or tab. */
export type ToolDialogProps = {
  initial?: unknown;
  start?: string;
  onSubmit: (data: unknown, image: { svg?: string; dataURL?: string; width: number; height: number }) => void;
  onClose: () => void;
  /** Beside the board rather than over it (a tool whose `docked` is set). */
  docked?: boolean;
};

export type ToolKind =
  | "formula" | "graph" | "model" | "matrix" | "geometry" | "analysis" | "statistics" | "integral" | "ode"
  | "trig" | "algo" | "nt" | "comb" | "gt" | "logic" | "complex" | "mental" | "tactics" | "strategies" | "algebra" | "powers" | "coord" | "deriv" | "multivar" | "randvar" | "likelihood" | "information" | "regression" | "naiveBayes" | "applied" | "inference" | "practice" | "vectors" | "sequences" | "functions" | "identities" | "polynomials" | "euclid" | "numerical" | "ai";

export type Tool = {
  Dialog: LazyExoticComponent<ComponentType<ToolDialogProps>>;
  /** Title of the panel when a picture of this kind is opened again. */
  edit: Word;
  /** Opens beside the board instead of over it, and stays open while other tools are used. */
  docked?: boolean;
  /** For the tool search: the dialog's tabs (key → label; the key opens that tab), their hints, and more names per tab. */
  topics?: (t: Dict) => Record<string, string>;
  hints?: (t: Dict) => Record<string, string>;
  names?: (t: Dict) => Record<string, Record<string, string>>;
};

// Each dialog types its own spec; here they are all the same shape.
const load = <M,>(importer: () => Promise<M>, name: keyof M) =>
  lazy(() => importer().then((m) => ({ default: m[name] as unknown as ComponentType<ToolDialogProps> })));

export const TOOLS: Record<ToolKind, Tool> = {
  formula: { Dialog: load(() => import("./components/FormulaDialog"), "FormulaDialog"), edit: "editFormula" },
  graph: { Dialog: load(() => import("./components/GraphDialog"), "GraphDialog"), edit: "editGraph" },
  model: { Dialog: load(() => import("./components/ModelDialog"), "ModelDialog"), edit: "editModel", topics: (t) => ({ bar: t.barModel, fraction: t.fractions, percent: t.percent, bond: t.numberBond, placeValue: t.placeValue, addition: t.addition, subtraction: t.subtraction, multiply: t.multiplication, fracop: t.fracOps, percratio: t.percRatio }) },
  matrix: { Dialog: load(() => import("./components/MatrixDialog"), "MatrixDialog"), edit: "editMatrix", topics: (t) => ({ calc: t.matrixCalc, transform: t.matrixTransform, space: t.matrixSpaces }), hints: (t) => ({ space: Object.values(t.spaceHints).join(" ") }) },
  geometry: { Dialog: load(() => import("./components/GeometryDialog"), "GeometryDialog"), edit: "editGeometry" },
  analysis: { Dialog: load(() => import("./components/AnalysisDialog"), "AnalysisDialog"), edit: "editAnalysis", topics: (t) => t.analysisTopics, hints: (t) => t.analysisHints },
  statistics: { Dialog: load(() => import("./components/StatsDialog"), "StatsDialog"), edit: "editStatistics", topics: (t) => t.statTopics, hints: (t) => t.statHints },
  integral: { Dialog: load(() => import("./components/IntegralDialog"), "IntegralDialog"), edit: "editIntegral", topics: (t) => t.intTopics, hints: (t) => t.intHints },
  ode: { Dialog: load(() => import("./components/OdeDialog"), "OdeDialog"), edit: "editOde", topics: (t) => t.odeTopics, hints: (t) => t.odeHints },
  trig: { Dialog: load(() => import("./components/TrigDialog"), "TrigDialog"), edit: "editTrig", topics: (t) => t.trigTopics, hints: (t) => t.trigHints },
  algo: { Dialog: load(() => import("./components/AlgoDialog"), "AlgoDialog"), edit: "editAlgo", topics: (t) => t.algoTopics,
    hints: (t) => t.algoHints,
    names: (t) => {
      const w = t.algoWords;
      return { sort: w.sortNames, search: { binary: w.searchNames.binary, linear: w.searchNames.linear }, pattern: w.pattern.names, graph: w.graphNames, tree: w.treeNames, ds: w.dsNames, dp: w.dpNames };
    } },
  nt: { Dialog: load(() => import("./components/NtDialog"), "NtDialog"), edit: "editNt", topics: (t) => t.ntTopics, hints: (t) => t.ntHints },
  comb: { Dialog: load(() => import("./components/CombDialog"), "CombDialog"), edit: "editComb", topics: (t) => t.combTopics, hints: (t) => t.combHints, names: (t) => ({ count: t.combWords.countNames }) },
  gt: { Dialog: load(() => import("./components/GtDialog"), "GtDialog"), edit: "editGt", topics: (t) => t.gtTopics, hints: (t) => t.gtHints },
  logic: { Dialog: load(() => import("./components/LogicDialog"), "LogicDialog"), edit: "editLogic", topics: (t) => t.logicTopics, hints: (t) => t.logicHints },
  complex: { Dialog: load(() => import("./components/ComplexDialog"), "ComplexDialog"), edit: "editComplex", topics: (t) => t.cxTopics, hints: (t) => t.cxHints },
  mental: { Dialog: load(() => import("./components/MentalDialog"), "MentalDialog"), edit: "editMental", topics: (t) => t.mentalTopics, hints: (t) => t.mentalHints },
  tactics: { Dialog: load(() => import("./components/TacticsDialog"), "TacticsDialog"), edit: "editTactics", topics: (t) => t.tacticsTopics, hints: (t) => t.tacticsHints },
  strategies: { Dialog: load(() => import("./components/StrategiesDialog"), "StrategiesDialog"), edit: "editStrategies", topics: (t) => t.strategiesTopics, hints: (t) => t.strategiesHints },
  algebra: { Dialog: load(() => import("./components/AlgebraDialog"), "AlgebraDialog"), edit: "editAlgebra", topics: (t) => t.algebraTopics, hints: (t) => t.algebraHints },
  coord: { Dialog: load(() => import("./components/CoordDialog"), "CoordDialog"), edit: "editCoord", topics: (t) => t.coordTopics, hints: (t) => t.coordHints },
  vectors: { Dialog: load(() => import("./components/VecDialog"), "VecDialog"), edit: "editVectors", topics: (t) => t.vecTopics, hints: (t) => t.vecHints },
  deriv: { Dialog: load(() => import("./components/DerivDialog"), "DerivDialog"), edit: "editDeriv", topics: (t) => t.derivTopics, hints: (t) => t.derivHints },
  multivar: { Dialog: load(() => import("./components/MultivarDialog"), "MultivarDialog"), edit: "editMultivar", topics: (t) => t.multivarTopics, hints: (t) => t.multivarHints },
  randvar: { Dialog: load(() => import("./components/RandvarDialog"), "RandvarDialog"), edit: "editRandvar", topics: (t) => t.randvarTopics, hints: (t) => t.randvarHints },
  likelihood: { Dialog: load(() => import("./components/LikelihoodDialog"), "LikelihoodDialog"), edit: "editLikelihood", topics: (t) => t.likelihoodTopics, hints: (t) => t.likelihoodHints },
  information: { Dialog: load(() => import("./components/InformationDialog"), "InformationDialog"), edit: "editInformation", topics: (t) => t.informationTopics, hints: (t) => t.informationHints },
  regression: { Dialog: load(() => import("./components/RegressionDialog"), "RegressionDialog"), edit: "editRegression", topics: (t) => t.regressionTopics, hints: (t) => t.regressionHints },
  naiveBayes: { Dialog: load(() => import("./components/NaiveBayesDialog"), "NaiveBayesDialog"), edit: "editNaiveBayes", topics: (t) => t.naiveBayesTopics, hints: (t) => t.naiveBayesHints },
  applied: { Dialog: load(() => import("./components/AppDialog"), "AppDialog"), edit: "editApplied", topics: (t) => t.appTopics, hints: (t) => t.appHints },
  inference: { Dialog: load(() => import("./components/InfDialog"), "InfDialog"), edit: "editInference", topics: (t) => t.infTopics, hints: (t) => t.infHints },
  practice: {
    Dialog: load(() => import("./components/PracticeDialog"), "PracticeDialog"),
    edit: "editPractice",
    docked: true,
    topics: (t) => ({ number: t.practiceNumber, algebra: t.practiceAlgebra, geometry: t.practiceGeometry, calculus: t.practiceCalculus, data: t.practiceData }),
    hints: (t) => t.practiceHints,
    names: (t) => Object.fromEntries(AREAS.map((a) => [a, Object.fromEntries(SKILLS[a].map((s) => [s, t.pracWords.skills[s]]))])),
  },
  powers: { Dialog: load(() => import("./components/PowersDialog"), "PowersDialog"), edit: "editPowers", topics: (t) => t.powersTopics, hints: (t) => t.powersHints },
  sequences: { Dialog: load(() => import("./components/SeqDialog"), "SeqDialog"), edit: "editSequences", topics: (t) => t.seqTopics, hints: (t) => t.seqHints },
  functions: { Dialog: load(() => import("./components/FnDialog"), "FnDialog"), edit: "editFunctions", topics: (t) => t.fnTopics, hints: (t) => t.fnHints },
  identities: { Dialog: load(() => import("./components/IdDialog"), "IdDialog"), edit: "editIdentities", topics: (t) => t.idTopics, hints: (t) => t.idHints },
  polynomials: { Dialog: load(() => import("./components/PolyDialog"), "PolyDialog"), edit: "editPolynomials", topics: (t) => t.polyTopics, hints: (t) => t.polyHints },
  euclid: { Dialog: load(() => import("./components/EuclidDialog"), "EuclidDialog"), edit: "editEuclid", topics: (t) => t.euclidTopics, hints: (t) => t.euclidHints },
  numerical: { Dialog: load(() => import("./components/NumDialog"), "NumDialog"), edit: "editNumerical", topics: (t) => t.numTopics, hints: (t) => t.numHints },
  ai: { Dialog: load(() => import("./components/AiDialog"), "AiDialog"), edit: "editAi", topics: (t) => t.aiTopics, hints: (t) => t.aiHints },
};

export const isToolKind = (k: unknown): k is ToolKind => typeof k === "string" && Object.hasOwn(TOOLS, k);
